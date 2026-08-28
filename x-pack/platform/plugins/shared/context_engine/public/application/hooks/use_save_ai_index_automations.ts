/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AiIndexAutomation,
  AiIndexProperties,
  GetAiIndexResponse,
} from '../../../common/http_api/ai_indices';
import { toProperties, useSaveAiIndexField } from './use_save_ai_index_field';

const buildProperties = (
  aiIndex: GetAiIndexResponse,
  automations: AiIndexAutomation[]
): AiIndexProperties => ({
  ...toProperties(aiIndex),
  automations,
});

export const useSaveAiIndexAutomations = () => {
  const { save, isSaving } = useSaveAiIndexField<AiIndexAutomation[]>({
    errorTitle: i18n.translate('xpack.contextEngine.saveAiIndexAutomations.errorTitle', {
      defaultMessage: 'Unable to update automations',
    }),
    buildProperties,
  });

  return { saveAutomations: save, isSaving };
};
