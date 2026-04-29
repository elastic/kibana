/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';

export function getPatternAnalysisAvailable(application: ApplicationStart) {
  return (dataView: DataView) => {
    return (
      application.capabilities.aiops.enabled &&
      dataView.isTimeBased() &&
      dataView.fields.some((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT))
    );
  };
}
