/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';

export const CAI_CASES_INDEX_SCRIPT_ID = 'internal_cases_index_painless_script';
export const CAI_CASES_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    ctx._source.updated_title = ctx._source.cases.remove("title");
    ctx._source.remove("cases");
    ctx._source.remove("type")`,
};

export const CAI_ATTACHMENTS_INDEX_SCRIPT_ID = 'internal_cases_attachments_index_painless_script';
export const CAI_ATTACHMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: '',
};

export const CAI_COMMENTS_INDEX_SCRIPT_ID = 'internal_cases_comments_index_painless_script';
export const CAI_COMMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: '',
};
