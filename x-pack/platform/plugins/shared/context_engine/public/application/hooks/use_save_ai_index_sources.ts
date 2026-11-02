/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AiIndexProperties, GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SelectedSource } from '../components/source_picker';
import { toAiIndexSources } from '../utils/sources';
import { toProperties, useSaveAiIndexField } from './use_save_ai_index_field';

const buildProperties = (
  aiIndex: GetAiIndexResponse,
  selectedSources: SelectedSource[]
): AiIndexProperties => ({
  ...toProperties(aiIndex),
  sources: toAiIndexSources(selectedSources),
});

export const useSaveAiIndexSources = () => {
  const { save, isSaving } = useSaveAiIndexField<SelectedSource[]>({
    errorTitle: i18n.translate('xpack.contextEngine.saveAiIndexSources.errorTitle', {
      defaultMessage: 'Unable to update sources',
    }),
    buildProperties,
  });

  return { saveSources: save, isSaving };
};
