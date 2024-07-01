/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { useCallback } from 'react';

export const DEFAULT_COLOR = '#D36086';

export const useQuickPromptEditor = ({
  onSelectedQuickPromptChange,
  setUpdatedQuickPromptSettings,
}: {
  onSelectedQuickPromptChange: (quickPrompt?: PromptResponse) => void;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
}) => {
  const onQuickPromptDeleted = useCallback(
    (title: string) => {
      setUpdatedQuickPromptSettings((prev) => prev.filter((qp) => qp.name !== title));
    },
    [setUpdatedQuickPromptSettings]
  );

  // When top level quick prompt selection changes
  const onQuickPromptSelectionChange = useCallback(
    (quickPrompt?: PromptResponse | string) => {
      const isNew = typeof quickPrompt === 'string';
      const newSelectedQuickPrompt: PromptResponse | undefined = isNew
        ? {
            name: quickPrompt,
            id: quickPrompt,
            content: '',
            color: DEFAULT_COLOR,
            categories: [],
            promptType: PromptTypeEnum.quick,
          }
        : quickPrompt;

      if (newSelectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.name === newSelectedQuickPrompt.name);

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
