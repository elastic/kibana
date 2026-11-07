/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { CaseStatusConfiguration } from '../../../../common/types/domain';
import { useCaseStatuses } from '../../status/use_case_statuses';
import { PauseReasonModal } from '../components/pause_reason_modal';

interface UsePauseReasonModalProps {
  onPause: (status: CaseStatusConfiguration, reason: string) => void;
}

/**
 * Collects the required reason before a status that pauses time tracking is applied. The
 * pending status is kept here so callers only decide *whether* to ask.
 */
export const usePauseReasonModal = ({ onPause }: UsePauseReasonModalProps) => {
  const { pauseReasons } = useCaseStatuses();
  const [pending, setPending] = useState<{
    status: CaseStatusConfiguration;
    caseCount: number;
  } | null>(null);

  const openPauseReasonModal = useCallback((status: CaseStatusConfiguration, caseCount = 1) => {
    setPending({ status, caseCount });
  }, []);

  const closeModal = useCallback(() => setPending(null), []);

  const onSubmit = useCallback(
    (reason: string) => {
      if (pending) {
        onPause(pending.status, reason);
      }
      setPending(null);
    },
    [onPause, pending]
  );

  return {
    openPauseReasonModal,
    pauseReasonModal: pending ? (
      <PauseReasonModal
        statusLabel={pending.status.label}
        caseCount={pending.caseCount}
        reasons={pauseReasons}
        onClose={closeModal}
        onSubmit={onSubmit}
      />
    ) : null,
  };
};
