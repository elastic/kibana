/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ModelCard } from './model_card';
import type { GroupedModel } from './utils';

describe('ModelCard', () => {
  const baseModel: GroupedModel = {
    service: 'elastic',
    modelName: 'my-model',
    taskTypes: ['text_embedding', 'chat_completion'],
    categories: ['Embedding', 'LLM'],
    endpoints: [],
  };

  it('renders name, test-subj, task types, categories, and avatar for a known provider', () => {
    const { getByText, getByTestId, container } = render(<ModelCard model={baseModel} />);

    expect(getByText('my-model', { exact: false })).toBeInTheDocument();
    expect(getByTestId('eisModelCard-my-model')).toBeInTheDocument();
    expect(getByText('text embedding, chat completion', { exact: false })).toBeInTheDocument();
    expect(getByText('Embedding')).toBeInTheDocument();
    expect(getByText('LLM')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type]')).not.toBeNull();
  });

  it('renders no avatar and falls back to raw service string for an unknown provider', () => {
    const unknownModel: GroupedModel = {
      ...baseModel,
      service: 'custom-unknown-provider',
    };
    const { getByText, container } = render(<ModelCard model={unknownModel} />);

    expect(container.querySelectorAll('.euiAvatar')).toHaveLength(0);
    expect(getByText('custom-unknown-provider', { exact: false })).toBeInTheDocument();
  });

  it('renders unknown task types as-is', () => {
    const model: GroupedModel = {
      ...baseModel,
      taskTypes: ['some_future_type'],
      categories: [],
    };
    const { getByText } = render(<ModelCard model={model} />);
    expect(getByText('some_future_type', { exact: false })).toBeInTheDocument();
  });
});
