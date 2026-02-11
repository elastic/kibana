/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

export const buildRule = (formValues: any): CreateRuleData => {
  // Transform form values into the shape expected by the API
  return {
    kind: formValues.kind,
    name: formValues.name,
    description: formValues.description,
    tags: formValues.tags,
    schedule: formValues.schedule,
    enabled: formValues.enabled,
    query: formValues.query,
    timeField: formValues.timeField,
    lookbackWindow: formValues.lookbackWindow,
    groupingKey: formValues.groupingKey,
  };
};
