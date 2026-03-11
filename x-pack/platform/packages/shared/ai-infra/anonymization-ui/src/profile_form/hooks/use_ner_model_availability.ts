/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { NER_MODEL_ID, type NerRule } from '@kbn/anonymization-common';
import { createNerModelsClient } from '../../common/services/ner_models/client';
import { useGetNerModelsAvailability } from '../../common/services/ner_models/hooks/use_get_ner_models_availability';
import type { ProfileFormProps } from '../profile_form_props';

interface UseNerModelAvailabilityParams {
  nerRules: NerRule[];
  draftModelId: string;
  usesTrustedNerModelProvider: boolean;
  fetch: ProfileFormProps['fetch'];
}

export const useNerModelAvailability = ({
  nerRules,
  draftModelId,
  usesTrustedNerModelProvider,
  fetch,
}: UseNerModelAvailabilityParams) => {
  const nerModelsClient = useMemo(() => createNerModelsClient({ fetch }), [fetch]);

  const modelIdsToValidate = useMemo(() => {
    const enabledNerModelIds = nerRules
      .filter((rule) => rule.enabled)
      .map((rule) => (rule.modelId?.trim() ? rule.modelId.trim() : NER_MODEL_ID));

    if (enabledNerModelIds.length > 0) {
      return [...new Set(enabledNerModelIds)];
    }

    const normalizedDraftModelId = draftModelId?.trim() ? draftModelId.trim() : NER_MODEL_ID;
    return [normalizedDraftModelId];
  }, [draftModelId, nerRules]);

  const { data: unavailableNerModels = [] } = useGetNerModelsAvailability({
    client: nerModelsClient,
    modelIds: modelIdsToValidate,
    enabled: !usesTrustedNerModelProvider,
  });

  return {
    unavailableNerModels,
  };
};
