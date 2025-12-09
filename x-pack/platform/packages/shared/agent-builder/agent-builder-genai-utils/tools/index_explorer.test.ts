/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import type { ResourceDescriptor } from './index_explorer';
import { createIndexSelectorPrompt, formatResource } from './index_explorer';

describe('createIndexSelectorPrompt', () => {
  const nlQuery = 'some NL query';

  const indexDescriptor: ResourceDescriptor = {
    type: EsResourceType.index,
    name: 'some_index',
    description: 'some description',
    fields: ['foo', 'bar'],
  };

  it('returns a prompt containing the nl query', () => {
    const messages = createIndexSelectorPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const userPrompt = (messages[1] as string[])[1];

    expect(userPrompt).toContain(nlQuery);
  });

  it('returns a prompt containing the formatted resource', () => {
    const messages = createIndexSelectorPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const userPrompt = (messages[1] as string[])[1];

    expect(userPrompt).toContain(formatResource(indexDescriptor));
  });
});
