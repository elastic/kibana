/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useStartServices } from '../../../hooks';
import {
  sendCreateIacCallback,
  sendDeleteIacCallback,
  sendGetIacCallback,
} from '../../../hooks/use_request/iac_callback';
import type {
  IacCallback,
  IacCallbackIdentity,
} from '../../../../common/types/models/iac_callback';
import type { AccountType } from '../../../../common/types/models/cloud_connector';

export const IAC_CALLBACK_POLL_INTERVAL_MS = 3_000;
/** Stop polling after this even if the record has not expired yet. */
export const IAC_CALLBACK_POLL_TIMEOUT_MS = 15 * 60 * 1000;

export type IacCallbackClientStatus = 'idle' | 'pending' | 'received' | 'expired' | 'error';

/** The cloud connector created when the stack reported back. */
export interface IacCallbackCreated {
  id: string;
  name: string;
}

/** Identity details stored on the record at launch and used to create the cloud connector. */
export interface IacCallbackStartInput {
  connectorName?: string;
  accountType?: AccountType;
  iacKey?: string | null;
  iacBlueprintId?: string | null;
  iacBlueprintVersion?: string | null;
}

export interface UseIacCallbackResult {
  /** False when the callback can't be used: disabled, or no public https Kibana URL. */
  available: boolean;
  status: IacCallbackClientStatus;
  /** Set when the stack's report has created the cloud connector. */
  created?: IacCallbackCreated;
  /**
   * Creates a callback record and returns the stack parameters for the quick-create link.
   * Returns undefined when the callback is not available or the record could not be created.
   * The launch then goes ahead without it.
   */
  start: (identity: IacCallbackStartInput) => Promise<Record<string, string> | undefined>;
  /**
   * Stops waiting on the current record and retires it on the server, so a late report cannot
   * create an identity the form no longer watches. Resolves true when the stack had already
   * reported: the identity it made is surfaced through `created` (now, or by the next poll while
   * it is still being made), so the caller must not create one by hand.
   */
  cancel: () => Promise<boolean>;
}

/**
 * The URL the stack's Lambda uses to reach Kibana. Uses `serverBasePath` rather than `get()`
 * because the receive route has no space prefix. Only https URLs are returned, because the
 * template's `ElasticKibanaUrl` parameter only accepts https.
 */
export const getIacCallbackKibanaUrl = (
  basePath: { publicBaseUrl?: string; serverBasePath: string },
  origin: string = window.location.origin
): string | undefined => {
  const url = (basePath.publicBaseUrl ?? `${origin}${basePath.serverBasePath}`).replace(/\/+$/, '');
  return /^https:\/\//.test(url) ? url : undefined;
};

const toCreated = (item: IacCallback): IacCallbackCreated | undefined =>
  item.cloud_connector_id
    ? { id: item.cloud_connector_id, name: item.connector_name ?? item.cloud_connector_id }
    : undefined;

const toIdentityBody = (identity: IacCallbackStartInput): IacCallbackIdentity => {
  const body: IacCallbackIdentity = {};
  const name = identity.connectorName?.trim();
  if (name) {
    body.connector_name = name;
  }
  if (identity.accountType) {
    body.account_type = identity.accountType;
  }
  if (identity.iacKey !== undefined) {
    body.iac_key = identity.iacKey;
  }
  if (identity.iacBlueprintId !== undefined) {
    body.iac_blueprint_id = identity.iacBlueprintId;
  }
  if (identity.iacBlueprintVersion !== undefined) {
    body.iac_blueprint_version = identity.iacBlueprintVersion;
  }
  return body;
};

export const useIacCallback = ({ enabled }: { enabled: boolean }): UseIacCallbackResult => {
  const { http } = useStartServices();
  const [status, setStatus] = useState<IacCallbackClientStatus>('idle');
  const [created, setCreated] = useState<IacCallbackCreated | undefined>(undefined);
  // The record currently being waited on; a poll result for any other id is stale and ignored.
  const activeIdRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // `start` awaits the create request; don't poll a record created after the form unmounted.
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const cancel = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) {
      return false;
    }
    const { data } = await sendDeleteIacCallback(id);
    if (activeIdRef.current !== id) {
      // Superseded by a new Launch, or unmounted, while the request was in flight.
      return false;
    }
    const item = data?.item;
    if (item?.status === 'receiving') {
      // The stack reported first and its identity is being made; the poll picks it up.
      return true;
    }
    stopPolling();
    activeIdRef.current = undefined;
    if (item?.status === 'received') {
      setCreated(toCreated(item));
      setStatus('received');
      return true;
    }
    // Cancelled, or gone: either way nothing will arrive. A failed request is treated the same;
    // the key then expires on its own.
    setStatus('idle');
    return false;
  }, [stopPolling]);

  const startPolling = useCallback(
    (id: string, expiresAt: string) => {
      const deadline = Math.min(
        new Date(expiresAt).getTime(),
        Date.now() + IAC_CALLBACK_POLL_TIMEOUT_MS
      );
      timerRef.current = setInterval(async () => {
        if (activeIdRef.current !== id) {
          return;
        }
        if (Date.now() > deadline) {
          stopPolling();
          activeIdRef.current = undefined;
          setStatus('expired');
          return;
        }
        const { data, error } = await sendGetIacCallback(id);
        if (activeIdRef.current !== id) {
          return;
        }
        if (error || !data) {
          // Transient failures keep polling; a missing record (e.g. 404) ends the wait.
          if (error?.statusCode === 404) {
            stopPolling();
            activeIdRef.current = undefined;
            setStatus('error');
          }
          return;
        }
        if (data.item.status === 'received') {
          stopPolling();
          activeIdRef.current = undefined;
          setCreated(toCreated(data.item));
          setStatus('received');
        }
      }, IAC_CALLBACK_POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const start = useCallback(
    async (identity: IacCallbackStartInput) => {
      if (!enabled) {
        return undefined;
      }
      const kibanaUrl = getIacCallbackKibanaUrl(http.basePath);
      if (!kibanaUrl) {
        return undefined;
      }
      // A new Launch supersedes whatever the previous one was waiting on, including a received one.
      stopPolling();
      activeIdRef.current = undefined;
      setStatus('idle');

      const { data, error } = await sendCreateIacCallback({
        provider: 'aws',
        ...toIdentityBody(identity),
      });
      if (error || !data || !mountedRef.current) {
        return undefined;
      }
      activeIdRef.current = data.item.id;
      setCreated(undefined);
      setStatus('pending');
      startPolling(data.item.id, data.item.expires_at);

      return {
        ElasticKibanaUrl: kibanaUrl,
        ElasticApiKey: data.api_key,
        ElasticCallbackId: data.item.id,
      };
    },
    [enabled, http.basePath, stopPolling, startPolling]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      activeIdRef.current = undefined;
    };
  }, [stopPolling]);

  const available = enabled && getIacCallbackKibanaUrl(http.basePath) !== undefined;

  return { available, status, created, start, cancel };
};
