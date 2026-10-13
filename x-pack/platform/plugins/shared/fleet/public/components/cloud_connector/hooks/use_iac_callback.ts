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
import type { IacCallback } from '../../../../common/types/models/iac_callback';

export const IAC_CALLBACK_POLL_INTERVAL_MS = 3_000;
/** Stop polling after this even if the record has not expired yet; the user can still paste. */
export const IAC_CALLBACK_POLL_TIMEOUT_MS = 15 * 60 * 1000;

export type IacCallbackClientStatus =
  | 'idle'
  | 'pending'
  | 'received'
  | 'cancelled'
  | 'expired'
  | 'error';

export interface IacCallbackReceived {
  roleArn: string;
  stackArn: string;
  awsAccountId: string;
  region: string;
}

export interface UseIacCallbackResult {
  status: IacCallbackClientStatus;
  /** Set once the stack reported back. Kept across a later cancel. */
  received?: IacCallbackReceived;
  /**
   * Creates a callback record (cancelling the previous one) and returns the stack parameters to
   * put on the quick-create link. Undefined when the callback cannot be used — disabled, no public
   * https Kibana URL, or the record could not be created — in which case the launch proceeds
   * without it and the user pastes the values.
   */
  start: () => Promise<Record<string, string> | undefined>;
  /** Cancels the current record (if any) and invalidates its key. */
  cancel: () => Promise<void>;
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

const toReceived = (item: IacCallback): IacCallbackReceived | undefined =>
  item.role_arn && item.stack_arn && item.aws_account_id && item.region
    ? {
        roleArn: item.role_arn,
        stackArn: item.stack_arn,
        awsAccountId: item.aws_account_id,
        region: item.region,
      }
    : undefined;

export const useIacCallback = ({ enabled }: { enabled: boolean }): UseIacCallbackResult => {
  const { http } = useStartServices();
  const [status, setStatus] = useState<IacCallbackClientStatus>('idle');
  const [received, setReceived] = useState<IacCallbackReceived | undefined>(undefined);
  // The record currently being waited on; a poll result for any other id is stale and ignored.
  const activeIdRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
          setReceived(toReceived(item));
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
    // A new Launch supersedes whatever record the previous one created.
    await cancel();

    const { data, error } = await sendCreateIacCallback({ provider: 'aws' });
    if (error || !data) {
      return undefined;
    }
    activeIdRef.current = data.item.id;
    setReceived(undefined);
    setStatus('pending');
    startPolling(data.item.id, data.item.expires_at);

    return {
      ElasticKibanaUrl: kibanaUrl,
      ElasticApiKey: data.api_key,
      ElasticCallbackId: data.item.id,
    };
  }, [enabled, http.basePath, cancel, startPolling]);

  // Leaving the form cancels the wait so the key dies with it.
  useEffect(() => {
    return () => {
      stopPolling();
      const id = activeIdRef.current;
      activeIdRef.current = undefined;
      if (id) {
        sendDeleteIacCallback(id).catch(() => {});
      }
    };
  }, [stopPolling]);

  return { status, received, start, cancel };
};
