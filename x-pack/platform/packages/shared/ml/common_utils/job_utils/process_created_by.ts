/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CREATED_BY_LABEL } from '@kbn/ml-common-constants/new_job';

/**
 * If created_by is set in the job's custom_settings, remove it in case
 * it was created by a job wizard as the rules cannot currently be edited
 * in the job wizards and so would be lost in a clone.
 */
export function processCreatedBy(customSettings: estypes.MlCustomSettings) {
  if (Object.values(CREATED_BY_LABEL).includes(customSettings.created_by as CREATED_BY_LABEL)) {
    delete customSettings.created_by;
  }
}
