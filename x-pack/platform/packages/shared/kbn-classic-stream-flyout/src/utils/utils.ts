/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';

export const formatDataRetention = (template: TemplateDeserialized): string | undefined => {
  const { lifecycle } = template;

  if (!lifecycle?.enabled) {
    return undefined;
  }

  if (lifecycle.infiniteDataRetention) {
    return '∞';
  }

  if (lifecycle.value && lifecycle.unit) {
    return `${lifecycle.value}${lifecycle.unit}`;
  }

  return undefined;
};
