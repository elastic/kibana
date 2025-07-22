/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { DataStreamMigrationStatus } from '../../../../../../common/data_stream_types';
import { Step } from './flyout/steps/types';

export function useMigrationStep(
  status: DataStreamMigrationStatus | undefined,
  loadDataStreamMetadata: () => Promise<void>
) {
  const [step, setStep] = useState<Step>('initializing');

  useEffect(() => {
    if (step !== 'initializing') return;
    (async () => {
      await loadDataStreamMetadata();
    })();
  }, [step, loadDataStreamMetadata]);

  useEffect(() => {
    if (status === DataStreamMigrationStatus.completed) {
      const timeoutId = setTimeout(() => setStep('completed'), 1500);
      return () => clearTimeout(timeoutId);
    }
    if (status === DataStreamMigrationStatus.notStarted) {
      setStep('confirm');
    } else if (
      [
        DataStreamMigrationStatus.failed,
        DataStreamMigrationStatus.fetchFailed,
        DataStreamMigrationStatus.cancelled,
        DataStreamMigrationStatus.inProgress,
      ].includes(status as DataStreamMigrationStatus)
    ) {
      setStep('inProgress');
    }
  }, [status]);

  return [step, setStep] as const;
}
