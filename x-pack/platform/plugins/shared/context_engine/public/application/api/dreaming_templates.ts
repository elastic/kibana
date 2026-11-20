/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { AI_INDEX_INTERNAL_API_VERSION, DREAMING_TEMPLATES_PATH } from '../../../common/constants';
import type { ListDreamingTemplatesResponse } from '../../../common/dreaming_templates';

interface ListDreamingTemplatesArgs {
  signal?: AbortSignal;
}

/** Lists the example dreaming configs offered when an AI index is created. */
export const listDreamingTemplates = (
  http: HttpStart,
  { signal }: ListDreamingTemplatesArgs = {}
): Promise<ListDreamingTemplatesResponse> =>
  http.get<ListDreamingTemplatesResponse>(DREAMING_TEMPLATES_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });
