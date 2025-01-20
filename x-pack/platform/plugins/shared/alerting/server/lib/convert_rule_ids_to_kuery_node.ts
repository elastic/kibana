/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';

/**
 * This utility converts array of rule ids into qNode filter
 */

export const convertRuleIdsToKueryNode = (ids: string[]) =>
  nodeBuilder.or(ids.map((ruleId) => nodeBuilder.is('alert.id', `alert:${ruleId}`)));
