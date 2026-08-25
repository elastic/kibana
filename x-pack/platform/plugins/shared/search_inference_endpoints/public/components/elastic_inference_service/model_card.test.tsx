/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ModelCard } from './model_card';
import type { GroupedModel } from '../../utils/eis_utils';
import { EisModelStatus } from '../../types';

describe('ModelCard', () => {
  const baseModel: GroupedModel = {
    service: 'elastic',
    modelName: 'my-model',
    modelCreator: 'OpenAI',
    modelStatus: EisModelStatus.GA,
    taskTypes: ['text_embedding', 'chat_completion'],
    categories: ['Embedding', 'LLM'],
    endpoints: [],
  };

  it('renders name, test-subj, task types, categories, and avatar for a known creator', () => {
    const { getByText, getByTestId, container } = render(
      <ModelCard model={baseModel} onClick={jest.fn()} />
    );

    expect(getByText('my-model', { exact: false })).toBeInTheDocument();
    expect(getByTestId('eisModelCard-my-model')).toBeInTheDocument();
    expect(getByText('text embedding, chat completion', { exact: false })).toBeInTheDocument();
    expect(getByText('Embedding')).toBeInTheDocument();
    expect(getByText('LLM')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type]')).not.toBeNull();
  });

  it('renders avatar with fallback icon for an unknown creator', () => {
    const unknownModel: GroupedModel = {
      ...baseModel,
      modelCreator: 'UnknownCorp',
    };
    const { container } = render(<ModelCard model={unknownModel} onClick={jest.fn()} />);

    expect(container.querySelectorAll('.euiAvatar')).toHaveLength(1);
  });

  it('renders unknown task types as-is', () => {
    const model = {
      ...baseModel,
      taskTypes: ['some_future_type'],
      categories: [],
    } as unknown as GroupedModel;
    const { getByText } = render(<ModelCard model={model} onClick={jest.fn()} />);
    expect(getByText('some_future_type', { exact: false })).toBeInTheDocument();
  });

  describe('Preview badge', () => {
    it('renders the preview badge when model status is Preview', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.Preview,
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      expect(getByTestId('modelPreviewBadge-my-model')).toBeInTheDocument();
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('does not render the preview badge when model status is GA', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('modelPreviewBadge-my-model')).not.toBeInTheDocument();
    });
  });

  describe('Deprecated badge', () => {
    it('renders the deprecated badge when model status is Deprecated and metadata has an EOL date', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.Deprecated,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
            end_of_life_date: '2040-12-31',
          },
        },
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      expect(getByTestId('modelDeprecatedBadge-my-model')).toBeInTheDocument();
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('renders the deprecated badge when model status is Deprecated and metadata has no EOL date', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.Deprecated,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
          },
        },
      };
      const { getByTestId } = render(<ModelCard model={model} onClick={jest.fn()} />);
      expect(getByTestId('modelDeprecatedBadge-my-model')).toBeInTheDocument();
    });

    it('does not render the deprecated badge when model status is GA', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
    });
  });

  describe('EOL badge', () => {
    it('renders the EOL badge when model status is DeprecatedEOL and metadata has an EOL date', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.DeprecatedEOL,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
            end_of_life_date: '2025-06-01',
          },
        },
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      expect(getByTestId('modelEolBadge-my-model')).toBeInTheDocument();
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
    });

    it('renders the EOL badge when model status is DeprecatedEOL and metadata has no EOL date', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.DeprecatedEOL,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
          },
        },
      };
      const { getByTestId } = render(<ModelCard model={model} onClick={jest.fn()} />);
      expect(getByTestId('modelEolBadge-my-model')).toBeInTheDocument();
    });

    it('does not render the EOL badge when model status is GA', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });
  });
});
