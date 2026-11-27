/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_QUERY_LIMIT } from '../../../../common/constants';

export const KI_GRAPH_MAX_ROWS = MAX_AI_INDEX_QUERY_LIMIT;

export const buildKiGraphQuery = (dest: string): string =>
  [
    `FROM ${JSON.stringify(dest)} METADATA _id, _index`,
    'EVAL id = COALESCE(id, _id)',
    'KEEP id, _index, type, title, attributes, references.uri, references.relation, governance.provenance.created_by.uri, governance.lifecycle.status, updated_at',
    'SORT updated_at DESC',
    `LIMIT ${KI_GRAPH_MAX_ROWS}`,
  ].join('\n| ');
