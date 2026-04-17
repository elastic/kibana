/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANONYMIZATION_ENTITY_CLASSES,
  type AnonymizationEntityClass,
} from '@kbn/anonymization-common';

export const isAnonymizationEntityClass = (value: string): value is AnonymizationEntityClass =>
  (ANONYMIZATION_ENTITY_CLASSES as readonly string[]).includes(value);
