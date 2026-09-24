/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AiIndexProperties, GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { toProperties, useSaveAiIndexField } from './use_save_ai_index_field';

const buildProperties = (
  aiIndex: GetAiIndexResponse,
  memoryEnabled: boolean
): AiIndexProperties => ({
  ...toProperties(aiIndex),
  memory_enabled: memoryEnabled,
});

export const useSaveAiIndexMemory = () => {
  const { save, isSaving } = useSaveAiIndexField<boolean>({
    errorTitle: i18n.translate('xpack.contextEngine.saveAiIndexMemory.errorTitle', {
      defaultMessage: 'Unable to update memory',
    }),
    buildProperties,
  });

  return { saveMemoryEnabled: save, isSaving };
};
