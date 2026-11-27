/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { AI_INDEX_INTERNAL_API_VERSION, DREAMING_TEMPLATES_PATH } from '../../../common/constants';
import type { ListDreamingTemplatesResponse } from '../../../common/dreaming_templates';
import { listDreamingTemplates } from './dreaming_templates';

describe('listDreamingTemplates', () => {
  const createHttp = () => coreMock.createStart().http;

  it('requests the versioned internal endpoint and returns the response', async () => {
    const http = createHttp();
    const response: ListDreamingTemplatesResponse = { templates: [] };
    http.get.mockResolvedValue(response);

    const result = await listDreamingTemplates(http);

    expect(http.get).toHaveBeenCalledWith(DREAMING_TEMPLATES_PATH, {
      version: AI_INDEX_INTERNAL_API_VERSION,
    });
    expect(result).toBe(response);
  });

  it('forwards the abort signal when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ templates: [] });
    const signal = new AbortController().signal;

    await listDreamingTemplates(http, { signal });

    expect(http.get).toHaveBeenCalledWith(DREAMING_TEMPLATES_PATH, {
      version: AI_INDEX_INTERNAL_API_VERSION,
      signal,
    });
  });
});
