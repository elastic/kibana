/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { ReindexStatus } from '@kbn/reindex-service-plugin/common';

import { getReindexStatus, startReindex } from '../../services';

const POLL_INTERVAL = 3000;

interface UseConvertIndexToLookupArgs {
  sourceIndexName: string;
  onSuccess: (newIndexName: string) => void;
  onClose: () => void;
}

export const useConvertIndexToLookup = ({
  sourceIndexName,
  onSuccess,
  onClose,
}: UseConvertIndexToLookupArgs) => {
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  }, [onSuccess, onClose]);

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  const updateStatus = useCallback(async () => {
    clearPollInterval();

    const { data, error } = await getReindexStatus(sourceIndexName);

    if (error) {
      setErrorMessage(error.message);
      setIsConverting(false);
      return;
    }

    if (data?.reindexOp?.status === ReindexStatus.inProgress) {
      pollIntervalIdRef.current = setTimeout(updateStatus, POLL_INTERVAL);
    } else if (
      data?.reindexOp?.status === ReindexStatus.failed ||
      data?.reindexOp?.status === ReindexStatus.cancelled
    ) {
      setErrorMessage(
        data?.reindexOp?.errorMessage ??
          i18n.translate(
            'xpack.idxMgmt.convertToLookupIndexAction.reindexFailedOrCancelledErrorMessage',
            {
              defaultMessage: 'Reindex did not complete successfully.',
            }
          )
      );
      setIsConverting(false);
      return;
    } else {
      setIsConverting(false);
      onCloseRef.current();

      if (data?.reindexOp?.newIndexName) {
        onSuccessRef.current(data.reindexOp.newIndexName);
      }
    }
  }, [clearPollInterval, sourceIndexName]);

  const convert = async (lookupIndexName: string) => {
    setIsConverting(true);
    setErrorMessage('');

    const { error } = await startReindex(sourceIndexName, lookupIndexName);

    if (error) {
      setErrorMessage(error.message);
      setIsConverting(false);
      return;
    }

    await updateStatus();
  };

  useEffect(() => {
    return () => {
      clearPollInterval();
    };
  }, [clearPollInterval, sourceIndexName]);

  return { isConverting, errorMessage, convert };
};
