/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

export interface ResumeSubmitState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  setSubmitting: (value: boolean) => void;
  setSubmitted: (value: boolean) => void;
}

/**
 * Submit state shared by every resume button of one run, so a submit disables all of them.
 * It resets when the run or the waiting step changes.
 */
export const useResumeSubmitState = (
  executionId: string,
  waitingStepExecutionId: string | undefined
): ResumeSubmitState => {
  const [isResumeSubmitting, setIsResumeSubmitting] = useState(false);
  const [isResumeSubmitted, setIsResumeSubmitted] = useState(false);
  const resumeSubmitState = useMemo(
    () => ({
      isSubmitting: isResumeSubmitting,
      isSubmitted: isResumeSubmitted,
      setSubmitting: setIsResumeSubmitting,
      setSubmitted: setIsResumeSubmitted,
    }),
    [isResumeSubmitting, isResumeSubmitted]
  );

  // The selected step is URL state: switching runs already drops `stepExecutionId`, and
  // clearing it here would wipe a deep-linked step on mount.
  useEffect(() => {
    setIsResumeSubmitting(false);
    setIsResumeSubmitted(false);
  }, [executionId]);

  useEffect(() => {
    setIsResumeSubmitting(false);
    setIsResumeSubmitted(false);
  }, [waitingStepExecutionId]);

  return resumeSubmitState;
};
