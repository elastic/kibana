/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReindexStatus } from '@kbn/reindex-service-plugin/common';
import { ConvertToLookupIndexModal } from './convert_to_lookup_index_modal';

import { startReindex, getReindexStatus } from '../../../../../services';

const POLL_INTERVAL = 3000;

export const ConvertToLookupIndexModalContainer = ({
  onCloseModal,
  onSuccess,
  sourceIndexName,
}: {
  onCloseModal: () => void;
  onSuccess: (lookupIndexName: string) => void;
  sourceIndexName: string;
}) => {
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
    } else {
      setIsConverting(false);
      onCloseModal();

      if (data?.reindexOp?.newIndexName) {
        onSuccess(data.reindexOp.newIndexName);
      }
    }
  }, [clearPollInterval, sourceIndexName, onCloseModal, onSuccess]);

  const onConvert = async (lookupIndexName: string) => {
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

  const onCancel = () => {
    // TODO: Implement cancel reindex
    onCloseModal();
  };

  useEffect(() => {
    return () => {
      clearPollInterval();
    };
  }, [clearPollInterval]);

  return (
    <ConvertToLookupIndexModal
      onCloseModal={onCancel}
      onConvert={onConvert}
      sourceIndexName={sourceIndexName}
      isConverting={isConverting}
      errorMessage={errorMessage}
    />
  );
};
