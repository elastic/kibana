/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PromptResponse,
  PerformBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { useCallback } from 'react';
import { useAssistantContext } from '../../../../..';

interface Props {
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  onSelectedSystemPromptChange: (systemPrompt?: PromptResponse) => void;
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
}

export const useSystemPromptEditor = ({
  setUpdatedSystemPromptSettings,
  onSelectedSystemPromptChange,
  promptsBulkActions,
  setPromptsBulkActions,
}: Props) => {
  const { currentAppId } = useAssistantContext();
  // When top level system prompt selection changes
  const onSystemPromptSelectionChange = useCallback(
    (systemPrompt?: PromptResponse | string) => {
      const isNew = typeof systemPrompt === 'string';
      const newSelectedSystemPrompt: PromptResponse | undefined = isNew
        ? {
            id: systemPrompt ?? '',
            content: '',
            name: systemPrompt ?? '',
            promptType: 'system',
            consumer: currentAppId,
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

        if (isNew) {
          setPromptsBulkActions({
            ...promptsBulkActions,
            create: [
              ...(promptsBulkActions.create ?? []),
              {
                ...newSelectedSystemPrompt,
              },
            ],
          });
        }
      }

      onSelectedSystemPromptChange(newSelectedSystemPrompt);
    },
    [
      currentAppId,
      onSelectedSystemPromptChange,
      promptsBulkActions,
      setPromptsBulkActions,
      setUpdatedSystemPromptSettings,
    ]
  );

  const onSystemPromptDeleted = useCallback(
    (id: string) => {
      setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== id));
      setPromptsBulkActions({
        ...promptsBulkActions,
        delete: {
          ids: [...(promptsBulkActions.delete?.ids ?? []), id],
        },
      });
    },
    [promptsBulkActions, setPromptsBulkActions, setUpdatedSystemPromptSettings]
  );

  return { onSystemPromptSelectionChange, onSystemPromptDeleted };
};
