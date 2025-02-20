/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FindPromptsResponse, PromptResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { PerformPromptsBulkActionRequestBody as PromptsPerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { HttpSetup } from '@kbn/core-http-browser';
import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import { getRandomEuiColor } from '../../quick_prompts/quick_prompt_settings/helpers';
import { bulkUpdatePrompts, PromptContextTemplate } from '../../../..';

interface Params {
  allPrompts: FindPromptsResponse;
  currentAppId: string;
  http: HttpSetup;
  promptsLoaded: boolean;
}
interface QuickPromptUpdater {
  onPromptContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
}: Params): QuickPromptUpdater => {
  const [promptsBulkActions, setPromptsBulkActions] = useState<PromptsPerformBulkActionRequestBody>(
    {}
  );
  const [selectedQuickPromptId, setSelectedQuickPromptId] = useState<string | undefined>();
  const [quickPromptSettings, setUpdatedQuickPromptSettings] = useState<PromptResponse[]>(
    allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
  );

  const selectedQuickPrompt: PromptResponse | undefined = useMemo(
    () => quickPromptSettings.find((qp) => qp.id === selectedQuickPromptId),
    [quickPromptSettings, selectedQuickPromptId]
  );

  useEffect(() => {
    // Update quick prompts settings when prompts are loaded
    if (promptsLoaded) {
      setUpdatedQuickPromptSettings(
        allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
      );
    }
  }, [allPrompts.data, promptsLoaded]);

  const onQuickPromptSelect = useCallback(
    (quickPrompt?: PromptResponse | string, color?: string) => {
      if (quickPrompt == null) {
        return setSelectedQuickPromptId(undefined);
      }
      const isNew = typeof quickPrompt === 'string';
      const qpColor = color ? color : isNew ? getRandomEuiColor() : quickPrompt.color;
      const newSelectedQuickPrompt: PromptResponse | undefined = isNew
        ? {
            name: quickPrompt,
            id: quickPrompt,
            content: '',
            color: qpColor,
            categories: [],
            promptType: PromptTypeEnum.quick,
            consumer: currentAppId,
          }
        : quickPrompt;

      setUpdatedQuickPromptSettings((prev) =>
        !prev.some((sp) => sp.id === newSelectedQuickPrompt.id)
          ? [...prev, newSelectedQuickPrompt]
          : prev
      );

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

      setSelectedQuickPromptId(newSelectedQuickPrompt.id);
    },
    [currentAppId, promptsBulkActions.create]
  );

  const onPromptContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev): PromptResponse[] =>
          prev.map((sp): PromptResponse => {
            if (sp.id === selectedQuickPrompt.id) {
              return {
                ...sp,
                content: e.target.value,
              };
            }
            return sp;
          })
        );
        const existingPrompt = quickPromptSettings.find((qp) => qp.id === selectedQuickPrompt.id);
        if (existingPrompt) {
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
                      content: e.target.value,
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
                      content: e.target.value,
                    },
                  ],
                }),
          };
          setPromptsBulkActions(newBulkActions);
        }
      }
    },
    [promptsBulkActions, selectedQuickPrompt, quickPromptSettings]
  );

  const onQuickPromptContextChange = useCallback(
    (pc: PromptContextTemplate[]) => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.name === selectedQuickPrompt.name);

          if (alreadyExists) {
            return prev.map((qp) => {
              if (qp.name === selectedQuickPrompt.name) {
                return {
                  ...qp,
                  categories: pc.map((p) => p.category),
                };
              }
              return qp;
            });
          }
          return prev;
        });

        const existingPrompt = quickPromptSettings.find((sp) => sp.id === selectedQuickPrompt.id);
        if (existingPrompt) {
          setPromptsBulkActions({
            ...promptsBulkActions,
            ...(selectedQuickPrompt.name !== selectedQuickPrompt.id
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
      }
    },
    [
      promptsBulkActions,
      quickPromptSettings,
      selectedQuickPrompt,
      setPromptsBulkActions,
      setUpdatedQuickPromptSettings,
    ]
  );

  const onQuickPromptDelete = useCallback(
    (id: string) => {
      setUpdatedQuickPromptSettings((prev) => prev.filter((qp) => qp.id !== id));
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
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.name === selectedQuickPrompt.name);

          if (alreadyExists) {
            return prev.map((qp) => {
              if (qp.name === selectedQuickPrompt.name) {
                return {
                  ...qp,
                  color,
                };
              }
              return qp;
            });
          }
          return prev;
        });
        const existingPrompt = quickPromptSettings.find((sp) => sp.id === selectedQuickPrompt.id);
        if (existingPrompt) {
          setPromptsBulkActions({
            ...promptsBulkActions,
            ...(selectedQuickPrompt.name !== selectedQuickPrompt.id
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
      }
    },
    [
      promptsBulkActions,
      quickPromptSettings,
      selectedQuickPrompt,
      setPromptsBulkActions,
      setUpdatedQuickPromptSettings,
    ]
  );

  const resetQuickPromptSettings = useCallback((): void => {
    setPromptsBulkActions({});
    setUpdatedQuickPromptSettings(
      allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
    );
  }, [allPrompts]);

  const saveQuickPromptSettings = useCallback(async (): Promise<boolean> => {
    const hasBulkPrompts =
      promptsBulkActions.create || promptsBulkActions.update || promptsBulkActions.delete;
    const bulkPromptsResult = hasBulkPrompts
      ? // TODO add toasts?
        await bulkUpdatePrompts(http, promptsBulkActions, undefined)
      : undefined;
    return bulkPromptsResult?.success ?? true;
  }, [http, promptsBulkActions]);

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
