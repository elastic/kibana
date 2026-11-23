/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_QUERY_LIMIT } from '../../../../common/constants';
import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  RELATIONSHIP_KI_TYPE,
} from '../../../../common/dreaming';

export const KI_GRAPH_MAX_ROWS = MAX_AI_INDEX_QUERY_LIMIT;

export const buildKiGraphQuery = (dest: string): string =>
  [
    `FROM ${JSON.stringify(dest)} METADATA _id, _index`,
    'EVAL id = COALESCE(id, _id)',
    `WHERE type LIKE "${FACT_TYPE_PREFIX}*" OR type LIKE "${ENTITY_TYPE_PREFIX}*" OR type == "${RELATIONSHIP_KI_TYPE}"`,
    'KEEP id, _index, type, title, attributes',
    `LIMIT ${KI_GRAPH_MAX_ROWS}`,
  ].join('\n| ');
