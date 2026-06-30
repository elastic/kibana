/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a draft string while editing, but commits to the source only on blur.
 * If the draft is cleared and blurred, restores the last committed value.
 */
export const useBlurCommitDraft = ({
  committedValue,
  isDisabled = false,
  onFieldBlur,
  onCommit,
  onAfterCommit,
}: {
  committedValue: string;
  isDisabled?: boolean;
  onFieldBlur?: () => void;
  onCommit: (nextCommittedValue: string) => void;
  onAfterCommit?: () => void;
}) => {
  const isEditingRef = useRef(false);
  const [draftValue, setDraftValue] = useState<string>(committedValue);

  useEffect(() => {
    if (isEditingRef.current) return;
    setDraftValue(committedValue);
  }, [committedValue]);

  return {
    draftValue,
    setDraftValue,
    onChange: (nextDraftValue: string) => {
      isEditingRef.current = true;
      if (isDisabled) return;
      setDraftValue(nextDraftValue);
    },
    onBlur: () => {
      isEditingRef.current = false;
      if (isDisabled) return;

      onFieldBlur?.();

      const nextValue = draftValue.trim();
      if (nextValue === '') {
        setDraftValue(committedValue);
        return;
      }

      if (nextValue !== committedValue.trim()) {
        onCommit(nextValue);
      }

      onAfterCommit?.();
    },
  };
};
