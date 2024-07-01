/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { QuickPrompt } from '../types';

export const DEFAULT_COLOR = '#D36086';

export const useQuickPromptEditor = ({
  onSelectedQuickPromptChange,
  setUpdatedQuickPromptSettings,
}: {
  onSelectedQuickPromptChange: (quickPrompt?: QuickPrompt) => void;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
}) => {
  const onQuickPromptDeleted = useCallback(
    (title: string) => {
      setUpdatedQuickPromptSettings((prev) => prev.filter((qp) => qp.title !== title));
    },
    [setUpdatedQuickPromptSettings]
  );

  // When top level quick prompt selection changes
  const onQuickPromptSelectionChange = useCallback(
    (quickPrompt?: QuickPrompt | string) => {
      const isNew = typeof quickPrompt === 'string';
      const newSelectedQuickPrompt: QuickPrompt | undefined = isNew
        ? {
            title: quickPrompt ?? '',
            prompt: '',
            color: DEFAULT_COLOR,
            categories: [],
          }
        : quickPrompt;

      if (newSelectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.title === newSelectedQuickPrompt.title);

          if (!alreadyExists) {
            return [...prev, newSelectedQuickPrompt];
          }

          return prev;
        });
      }

      onSelectedQuickPromptChange(newSelectedQuickPrompt);
    },
    [onSelectedQuickPromptChange, setUpdatedQuickPromptSettings]
  );

  return { onQuickPromptDeleted, onQuickPromptSelectionChange };
};
