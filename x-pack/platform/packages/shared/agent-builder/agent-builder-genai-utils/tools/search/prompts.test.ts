/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import type { ResourceDescriptor } from '../index_explorer';
import {
  naturalLanguageSearchToolName,
  noMatchingResourceToolName,
  relevanceSearchToolName,
} from './inner_tools';
import { getSearchDispatcherPrompt } from './prompts';

describe('getSearchDispatcherPrompt', () => {
  const nlQuery = 'find the customer with ID 914255';

  const indexDescriptor: ResourceDescriptor = {
    type: EsResourceType.index,
    name: 'customers',
    description: 'customer records',
    fields: [
      { path: 'id', type: 'keyword' },
      { path: 'name', type: 'text' },
    ],
  };

  const getSystemPrompt = (messages: ReturnType<typeof getSearchDispatcherPrompt>) =>
    (messages[0] as [string, string])[1];

  const getUserPrompt = (messages: ReturnType<typeof getSearchDispatcherPrompt>) =>
    (messages[1] as [string, string])[1];

  it('embeds the user query in the user prompt', () => {
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    expect(getUserPrompt(messages)).toContain(nlQuery);
  });

  it('lists the resource name, description and field descriptors in the system prompt', () => {
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const systemPrompt = getSystemPrompt(messages);
    expect(systemPrompt).toContain(indexDescriptor.name);
    expect(systemPrompt).toContain(indexDescriptor.description!);
    expect(systemPrompt).toContain('id [keyword]');
    expect(systemPrompt).toContain('name [text]');
  });

  it('mentions all three dispatcher tool names in the system prompt', () => {
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const systemPrompt = getSystemPrompt(messages);
    expect(systemPrompt).toContain(relevanceSearchToolName);
    expect(systemPrompt).toContain(naturalLanguageSearchToolName);
    expect(systemPrompt).toContain(noMatchingResourceToolName);
  });

  it('includes custom instructions when provided', () => {
    const customInstructions = 'Always prefer the most recent data.';
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor],
      customInstructions,
    });

    expect(getSystemPrompt(messages)).toContain(customInstructions);
  });

  it('omits the Additional Instructions section when customInstructions is not provided', () => {
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    expect(getSystemPrompt(messages)).not.toContain('Additional Instructions');
  });

  it('lists multiple resources in the system prompt', () => {
    const aliasDescriptor: ResourceDescriptor = {
      type: EsResourceType.alias,
      name: 'orders-alias',
      description: 'Point to the following indices: orders-2024, orders-2025',
    };

    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [indexDescriptor, aliasDescriptor],
    });

    const systemPrompt = getSystemPrompt(messages);
    expect(systemPrompt).toContain(indexDescriptor.name);
    expect(systemPrompt).toContain(aliasDescriptor.name);
  });

  it('renders a valid prompt even when resources is empty', () => {
    const messages = getSearchDispatcherPrompt({
      nlQuery,
      resources: [],
    });

    expect(messages).toHaveLength(2);
    expect(getUserPrompt(messages)).toContain(nlQuery);
  });
});
