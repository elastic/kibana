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
  sendPrepareIacCallback,
} from '../../../hooks/use_request/iac_callback';
import type {
  IacCallback,
  IacCallbackIdentity,
} from '../../../../common/types/models/iac_callback';
import type { AccountType } from '../../../../common/types/models/cloud_connector';

export const IAC_CALLBACK_POLL_INTERVAL_MS = 3_000;
/** Stop polling after this even if the record has not expired yet. */
export const IAC_CALLBACK_POLL_TIMEOUT_MS = 15 * 60 * 1000;
const PREPARE_DEBOUNCE_MS = 300;

export type IacCallbackClientStatus =
  | 'idle'
  | 'pending'
  | 'received'
  | 'cancelled'
  | 'expired'
  | 'error';

/** The cloud connector receive created. The form does not copy ARNs out of the callback. */
export interface IacCallbackCreated {
  id: string;
  name: string;
}

/** What the form already knows, sent to the pending record so receive can create the connector. */
export interface IacCallbackPrepareInput {
  connectorName?: string;
  accountType?: AccountType;
  iacKey?: string | null;
  iacBlueprintId?: string | null;
  iacBlueprintVersion?: string | null;
}

export interface UseIacCallbackResult {
  status: IacCallbackClientStatus;
  /** Set once receive has created the cloud connector. */
  created?: IacCallbackCreated;
  /**
   * Creates a callback record (cancelling the previous one) and returns the stack parameters to
   * put on the quick-create link. Undefined when the callback cannot be used — disabled, no public
   * https Kibana URL, or the record could not be created — in which case the launch proceeds
   * without it and the user pastes the values.
   */
  start: () => Promise<Record<string, string> | undefined>;
  /** Cancels the current record (if any) and invalidates its key. */
  cancel: () => Promise<void>;
  /** Stores the form's name and template details on the pending record. No-op without one. */
  prepare: (identity: IacCallbackPrepareInput) => void;
}

/**
 * The URL the stack's Lambda must reach Kibana on. Uses `serverBasePath`, never `get()`: the
 * public route is space-less. Only an https URL is returned: the template's parameter pattern
 * rejects anything else, and a non-https Kibana is not reachable from AWS anyway.
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

const toPrepareBody = (identity: IacCallbackPrepareInput): IacCallbackIdentity => {
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
  // `start` awaits twice; a record created after the form went away must be cancelled, not polled.
  const mountedRef = useRef(true);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastPrepareRef = useRef<string | undefined>(undefined);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const cancel = useCallback(async () => {
    stopPolling();
    const id = activeIdRef.current;
    activeIdRef.current = undefined;
    setStatus((current) => (current === 'received' ? current : 'idle'));
    if (!id) {
      return;
    }
    // Best effort: the key expires on its own; a failed delete must not block the user.
    try {
      await sendDeleteIacCallback(id);
    } catch {
      // ignore
    }
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
        const { item } = data;
        if (item.status === 'received') {
          stopPolling();
          activeIdRef.current = undefined;
          setCreated(toCreated(item));
          setStatus('received');
        } else if (item.status === 'cancelled') {
          stopPolling();
          activeIdRef.current = undefined;
          setStatus('cancelled');
        }
      }, IAC_CALLBACK_POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const start = useCallback(async () => {
    if (!enabled) {
      return undefined;
    }
    const kibanaUrl = getIacCallbackKibanaUrl(http.basePath);
    if (!kibanaUrl) {
      return undefined;
    }
    // A new Launch supersedes whatever record the previous one created, including a received one.
    await cancel();
    setStatus('idle');

    if (!mountedRef.current) {
      return undefined;
    }
    const { data, error } = await sendCreateIacCallback({ provider: 'aws' });
    if (error || !data) {
      return undefined;
    }
    if (!mountedRef.current) {
      sendDeleteIacCallback(data.item.id).catch(() => {});
      return undefined;
    }
    activeIdRef.current = data.item.id;
    lastPrepareRef.current = undefined;
    setCreated(undefined);
    setStatus('pending');
    startPolling(data.item.id, data.item.expires_at);

    return {
      ElasticKibanaUrl: kibanaUrl,
      ElasticApiKey: data.api_key,
      ElasticCallbackId: data.item.id,
    };
  }, [enabled, http.basePath, cancel, startPolling]);

  const prepare = useCallback((identity: IacCallbackPrepareInput) => {
    if (prepareTimerRef.current) {
      clearTimeout(prepareTimerRef.current);
    }
    prepareTimerRef.current = setTimeout(() => {
      prepareTimerRef.current = undefined;
      const id = activeIdRef.current;
      if (!id) {
        return;
      }
      const body = toPrepareBody(identity);
      if (Object.keys(body).length === 0) {
        return;
      }
      const serialized = JSON.stringify(body);
      if (serialized === lastPrepareRef.current) {
        return;
      }
      lastPrepareRef.current = serialized;
      sendPrepareIacCallback(id, body).catch(() => {
        // The next edit retries. A missed prepare still leaves the role name as a fallback.
        if (lastPrepareRef.current === serialized) {
          lastPrepareRef.current = undefined;
        }
      });
    }, PREPARE_DEBOUNCE_MS);
  }, []);

  // Leaving the form cancels the wait so the key dies with it.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (prepareTimerRef.current) {
        clearTimeout(prepareTimerRef.current);
        prepareTimerRef.current = undefined;
      }
      stopPolling();
      const id = activeIdRef.current;
      activeIdRef.current = undefined;
      if (id) {
        sendDeleteIacCallback(id).catch(() => {});
      }
    };
  }, [stopPolling]);

  return { status, created, start, cancel, prepare };
};
