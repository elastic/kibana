/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { FindPromptsResponse, PromptResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { PerformPromptsBulkActionRequestBody as PromptsPerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas';
import { HttpSetup } from '@kbn/core-http-browser';
import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import { IToasts } from '@kbn/core-notifications-browser';
import { getRandomEuiColor } from '../../quick_prompts/quick_prompt_settings/helpers';
import { bulkUpdatePrompts, PromptContextTemplate } from '../../../..';

interface Params {
  allPrompts: FindPromptsResponse;
  currentAppId: string;
  http: HttpSetup;
  promptsLoaded: boolean;
  toasts?: IToasts;
}
interface QuickPromptUpdater {
  onPromptContentChange: (newValue: string) => void;
  onQuickPromptColorChange: EuiSetColorMethod;
  onQuickPromptContextChange: (promptContexts: PromptContextTemplate[]) => void;
  onQuickPromptDelete: (id: string) => void;
  onQuickPromptSelect: (quickPrompt?: PromptResponse | string) => void;
  quickPromptSettings: PromptResponse[];
  resetQuickPromptSettings: () => void;
  saveQuickPromptSettings: () => Promise<boolean>;
  selectedQuickPrompt?: PromptResponse;
}

export const useQuickPromptUpdater = ({
  allPrompts,
  currentAppId,
  http,
  promptsLoaded,
  toasts,
}: Params): QuickPromptUpdater => {
  const [promptsBulkActions, setPromptsBulkActions] = useState<PromptsPerformBulkActionRequestBody>(
    {}
  );
  const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<PromptResponse | undefined>();
  const [quickPromptSettings, setUpdatedQuickPromptSettings] = useState<PromptResponse[]>(
    allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
  );

  useEffect(() => {
    // Update quick prompts settings when prompts are loaded
    if (promptsLoaded) {
      setUpdatedQuickPromptSettings([
        ...allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick),
      ]);
    }
  }, [allPrompts.data, promptsLoaded]);

  const onQuickPromptSelect = useCallback(
    (quickPrompt?: PromptResponse | string, color?: string) => {
      if (quickPrompt == null) {
        return setSelectedQuickPrompt(undefined);
      }
      const isNew = typeof quickPrompt === 'string';
      const qpColor = color ? color : isNew ? getRandomEuiColor() : quickPrompt.color;
      const newSelectedQuickPrompt: PromptResponse | undefined = isNew
        ? {
            name: quickPrompt,
            id: '',
            content: '',
            color: qpColor,
            categories: [],
            promptType: PromptTypeEnum.quick,
            consumer: currentAppId,
          }
        : quickPrompt;

      if (isNew) {
        setPromptsBulkActions((prev) => ({
          ...prev,
          create: [
            ...(promptsBulkActions.create ?? []),
            {
              ...newSelectedQuickPrompt,
            },
          ],
        }));
      }

      setSelectedQuickPrompt(newSelectedQuickPrompt);
    },
    [currentAppId, promptsBulkActions.create]
  );

  const onPromptContentChange = useCallback(
    (newValue: string) => {
      if (selectedQuickPrompt != null) {
        setSelectedQuickPrompt({
          ...selectedQuickPrompt,
          content: newValue,
        });
        const newBulkActions = {
          ...promptsBulkActions,
          ...(selectedQuickPrompt.id !== ''
            ? {
                update: [
                  ...(promptsBulkActions.update ?? []).filter(
                    (p) => p.id !== selectedQuickPrompt.id
                  ),
                  {
                    ...selectedQuickPrompt,
                    content: newValue,
                  },
                ],
              }
            : {
                create: [
                  ...(promptsBulkActions.create ?? []).filter(
                    (p) => p.name !== selectedQuickPrompt.name
                  ),
                  {
                    ...selectedQuickPrompt,
                    content: newValue,
                  },
                ],
              }),
        };
        setPromptsBulkActions(newBulkActions);
      }
    },
    [promptsBulkActions, selectedQuickPrompt]
  );

  const onQuickPromptContextChange = useCallback(
    (pc: PromptContextTemplate[]) => {
      if (selectedQuickPrompt != null) {
        setSelectedQuickPrompt({
          ...selectedQuickPrompt,
          categories: pc.map((p) => p.category),
        });
        setPromptsBulkActions({
          ...promptsBulkActions,
          ...(selectedQuickPrompt.id !== ''
            ? {
                update: [
                  ...(promptsBulkActions.update ?? []).filter(
                    (p) => p.id !== selectedQuickPrompt.id
                  ),
                  {
                    ...selectedQuickPrompt,
                    categories: pc.map((p) => p.category),
                  },
                ],
              }
            : {
                create: [
                  ...(promptsBulkActions.create ?? []).filter(
                    (p) => p.name !== selectedQuickPrompt.name
                  ),
                  {
                    ...selectedQuickPrompt,
                    categories: pc.map((p) => p.category),
                  },
                ],
              }),
        });
      }
    },
    [promptsBulkActions, selectedQuickPrompt, setPromptsBulkActions]
  );

  const onQuickPromptDelete = useCallback(
    (id: string) => {
      setPromptsBulkActions({
        ...promptsBulkActions,
        delete: {
          ids: [...(promptsBulkActions.delete?.ids ?? []), id],
        },
      });
    },
    [promptsBulkActions, setPromptsBulkActions]
  );

  const onQuickPromptColorChange = useCallback<EuiSetColorMethod>(
    (color) => {
      if (selectedQuickPrompt != null) {
        setSelectedQuickPrompt({
          ...selectedQuickPrompt,
          color,
        });
        setPromptsBulkActions({
          ...promptsBulkActions,
          ...(selectedQuickPrompt.id !== ''
            ? {
                update: [
                  ...(promptsBulkActions.update ?? []).filter(
                    (p) => p.id !== selectedQuickPrompt.id
                  ),
                  {
                    ...selectedQuickPrompt,
                    color,
                  },
                ],
              }
            : {
                create: [
                  ...(promptsBulkActions.create ?? []).filter(
                    (p) => p.name !== selectedQuickPrompt.name
                  ),
                  {
                    ...selectedQuickPrompt,
                    color,
                  },
                ],
              }),
        });
      }
    },
    [promptsBulkActions, selectedQuickPrompt, setPromptsBulkActions]
  );

  const resetQuickPromptSettings = useCallback((): void => {
    setPromptsBulkActions({});
    setSelectedQuickPrompt(undefined);
  }, []);

  const saveQuickPromptSettings = useCallback(async (): Promise<boolean> => {
    const hasBulkPrompts =
      promptsBulkActions.create || promptsBulkActions.update || promptsBulkActions.delete;
    const bulkPromptsResult = hasBulkPrompts
      ? await bulkUpdatePrompts(http, promptsBulkActions, toasts)
      : undefined;
    resetQuickPromptSettings();
    return bulkPromptsResult?.success ?? false;
  }, [http, promptsBulkActions, resetQuickPromptSettings, toasts]);

  return {
    onPromptContentChange,
    onQuickPromptColorChange,
    onQuickPromptContextChange,
    onQuickPromptDelete,
    onQuickPromptSelect,
    quickPromptSettings,
    resetQuickPromptSettings,
    saveQuickPromptSettings,
    selectedQuickPrompt,
  };
};
