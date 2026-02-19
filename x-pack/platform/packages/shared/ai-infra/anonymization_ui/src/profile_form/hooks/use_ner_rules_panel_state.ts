/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { NER_ENTITY_CLASSES, type NerEntityClass, type NerRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import type { TrustedNerModelOption } from '../../contracts';

const DEFAULT_DRAFT_ALLOWED_ENTITIES: NerEntityClass[] = ['PER', 'ORG'];

const isNerEntityClass = (value: string): value is NerEntityClass =>
  NER_ENTITY_CLASSES.includes(value as NerEntityClass);

interface UseNerRulesPanelStateParams {
  nerRules: NerRule[];
  onNerRulesChange: (rules: NerRule[]) => void;
  isManageMode: boolean;
  isSubmitting: boolean;
  listTrustedNerModels?: () => Promise<TrustedNerModelOption[]>;
  nerRulesError?: string;
}

export const useNerRulesPanelState = ({
  nerRules,
  onNerRulesChange,
  isManageMode,
  isSubmitting,
  listTrustedNerModels,
  nerRulesError,
}: UseNerRulesPanelStateParams) => {
  const [nerDraft, setNerDraft] = useState({
    modelId: '',
    allowedEntityClasses: DEFAULT_DRAFT_ALLOWED_ENTITIES,
  });
  const [trustedNerModelOptions, setTrustedNerModelOptions] = useState<
    Array<{ value: string; text: string }>
  >([]);
  const [isTrustedNerModelsLoading, setIsTrustedNerModelsLoading] = useState(false);
  const [trustedNerModelsError, setTrustedNerModelsError] = useState<string | undefined>();

  const hasTrustedNerModel = trustedNerModelOptions.length > 0;
  const usesTrustedNerModelProvider = typeof listTrustedNerModels === 'function';
  const showValidationErrors = Boolean(nerRulesError);

  useEffect(() => {
    if (!listTrustedNerModels) {
      return;
    }

    let isCancelled = false;

    const loadTrustedNerModels = async () => {
      setIsTrustedNerModelsLoading(true);
      setTrustedNerModelsError(undefined);

      try {
        const models = await listTrustedNerModels();
        if (isCancelled) {
          return;
        }
        setTrustedNerModelOptions(
          models.map((model) => ({
            value: model.id,
            text: model.label,
          }))
        );
      } catch {
        if (isCancelled) {
          return;
        }
        setTrustedNerModelsError(
          i18n.translate('anonymizationUi.profiles.nerRules.modelsLookupError', {
            defaultMessage: 'Failed to load trusted NER models.',
          })
        );
      } finally {
        if (!isCancelled) {
          setIsTrustedNerModelsLoading(false);
        }
      }
    };

    void loadTrustedNerModels();

    return () => {
      isCancelled = true;
    };
  }, [listTrustedNerModels]);

  const updateNerRuleById = useCallback(
    (ruleId: string, updater: (rule: NerRule) => NerRule) => {
      const index = nerRules.findIndex((item) => item.id === ruleId);
      if (index < 0) {
        return;
      }

      const updated = [...nerRules];
      updated[index] = updater(updated[index]);
      onNerRulesChange(updated);
    },
    [nerRules, onNerRulesChange]
  );

  const removeNerRuleById = useCallback(
    (ruleId: string) => onNerRulesChange(nerRules.filter((rule) => rule.id !== ruleId)),
    [nerRules, onNerRulesChange]
  );

  const addNerRule = useCallback(() => {
    const modelId = nerDraft.modelId.trim();
    if (!modelId) {
      return;
    }

    const allowedEntityClasses = nerDraft.allowedEntityClasses.filter(isNerEntityClass);
    if (allowedEntityClasses.length === 0) {
      return;
    }

    onNerRulesChange([
      ...nerRules,
      {
        id: `${Date.now()}`,
        type: 'ner',
        modelId,
        allowedEntityClasses,
        enabled: true,
      },
    ]);
    setNerDraft({ modelId: '', allowedEntityClasses: DEFAULT_DRAFT_ALLOWED_ENTITIES });
  }, [nerDraft.allowedEntityClasses, nerDraft.modelId, nerRules, onNerRulesChange]);

  const setNerDraftModelId = useCallback((modelId: string) => {
    setNerDraft((draft) => ({ ...draft, modelId }));
  }, []);

  const setNerDraftAllowedEntities = useCallback((allowedEntityClasses: NerEntityClass[]) => {
    setNerDraft((draft) => ({ ...draft, allowedEntityClasses }));
  }, []);

  const updateRuleModelId = useCallback(
    (ruleId: string, modelId: string) => {
      updateNerRuleById(ruleId, (rule) => ({ ...rule, modelId }));
    },
    [updateNerRuleById]
  );

  const updateRuleAllowedEntityClasses = useCallback(
    (ruleId: string, allowedEntityClasses: NerEntityClass[]) => {
      updateNerRuleById(ruleId, (rule) => ({
        ...rule,
        allowedEntityClasses,
      }));
    },
    [updateNerRuleById]
  );

  const updateRuleEnabled = useCallback(
    (ruleId: string, enabled: boolean) => {
      updateNerRuleById(ruleId, (rule) => ({ ...rule, enabled }));
    },
    [updateNerRuleById]
  );

  const getModelOptionsForRule = useCallback(
    (modelId: string) => {
      if (!usesTrustedNerModelProvider) {
        return trustedNerModelOptions;
      }
      const hasCurrentModel = trustedNerModelOptions.some((option) => option.value === modelId);
      if (!hasCurrentModel && modelId.trim().length > 0) {
        return [{ value: modelId, text: modelId }, ...trustedNerModelOptions];
      }
      return trustedNerModelOptions;
    },
    [trustedNerModelOptions, usesTrustedNerModelProvider]
  );

  const isNerInputDisabled =
    !isManageMode ||
    isSubmitting ||
    isTrustedNerModelsLoading ||
    (usesTrustedNerModelProvider && !hasTrustedNerModel);

  return {
    nerDraft,
    trustedNerModelOptions,
    trustedNerModelsError,
    isTrustedNerModelsLoading,
    usesTrustedNerModelProvider,
    hasTrustedNerModel,
    isNerInputDisabled,
    showValidationErrors,
    addNerRule,
    removeNerRuleById,
    setNerDraftModelId,
    setNerDraftAllowedEntities,
    updateRuleModelId,
    updateRuleAllowedEntityClasses,
    updateRuleEnabled,
    getModelOptionsForRule,
    canAddRule:
      !isNerInputDisabled &&
      nerDraft.modelId.trim().length > 0 &&
      nerDraft.allowedEntityClasses.length > 0,
  };
};
