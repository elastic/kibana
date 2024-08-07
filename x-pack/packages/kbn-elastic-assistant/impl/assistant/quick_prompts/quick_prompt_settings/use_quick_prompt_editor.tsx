/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PromptResponse,
  PromptTypeEnum,
  PerformPromptsBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { useCallback } from 'react';
import { useAssistantContext } from '../../../..';

export const DEFAULT_COLOR = '#D36086';

export const useQuickPromptEditor = ({
  onSelectedQuickPromptChange,
  setUpdatedQuickPromptSettings,
  promptsBulkActions,
  setPromptsBulkActions,
}: {
  onSelectedQuickPromptChange: (quickPrompt?: PromptResponse) => void;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
}) => {
  const { currentAppId } = useAssistantContext();
  const onQuickPromptDeleted = useCallback(
    (id: string) => {
      setUpdatedQuickPromptSettings((prev) => prev.filter((qp) => qp.id !== id));
      setPromptsBulkActions({
        ...promptsBulkActions,
        delete: {
          ids: [...(promptsBulkActions.delete?.ids ?? []), id],
        },
      });
    },
    [promptsBulkActions, setPromptsBulkActions, setUpdatedQuickPromptSettings]
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
            consumer: currentAppId,
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

        if (isNew) {
          setPromptsBulkActions({
            ...promptsBulkActions,
            create: [
              ...(promptsBulkActions.create ?? []),
              {
                ...newSelectedQuickPrompt,
              },
            ],
          });
        }
      }

      onSelectedQuickPromptChange(newSelectedQuickPrompt);
    },
    [
      currentAppId,
      onSelectedQuickPromptChange,
      promptsBulkActions,
      setPromptsBulkActions,
      setUpdatedQuickPromptSettings,
    ]
  );

  return { onQuickPromptDeleted, onQuickPromptSelectionChange };
};
