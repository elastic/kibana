/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Prompt } from '../../../types';

interface Props {
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  onSelectedSystemPromptChange: (systemPrompt?: Prompt) => void;
}

export const useSystemPromptEditor = ({
  setUpdatedSystemPromptSettings,
  onSelectedSystemPromptChange,
}: Props) => {
  // When top level system prompt selection changes
  const onSystemPromptSelectionChange = useCallback(
    (systemPrompt?: Prompt | string) => {
      const isNew = typeof systemPrompt === 'string';
      const newSelectedSystemPrompt: Prompt | undefined = isNew
        ? {
            id: systemPrompt ?? '',
            content: '',
            name: systemPrompt ?? '',
            promptType: 'system',
          }
        : systemPrompt;

      if (newSelectedSystemPrompt != null) {
        setUpdatedSystemPromptSettings((prev) => {
          const alreadyExists = prev.some((sp) => sp.id === newSelectedSystemPrompt.id);

          if (!alreadyExists) {
            return [...prev, newSelectedSystemPrompt];
          }

          return prev;
        });
      }

      onSelectedSystemPromptChange(newSelectedSystemPrompt);
    },
    [onSelectedSystemPromptChange, setUpdatedSystemPromptSettings]
  );

  const onSystemPromptDeleted = useCallback(
    (id: string) => {
      setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== id));
    },
    [setUpdatedSystemPromptSettings]
  );

  return { onSystemPromptSelectionChange, onSystemPromptDeleted };
};
