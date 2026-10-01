/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
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

  it('renders the provider beside the icon, the model name, and category badges', () => {
    const { getByTestId, queryByTestId } = render(
      <ModelCard model={baseModel} onClick={jest.fn()} />
    );

    expect(getByTestId('eisModelCard-my-model')).toBeInTheDocument();
    expect(getByTestId('eisModelCardProvider-my-model')).toHaveTextContent('OpenAI');
    expect(getByTestId('eisModelCardName-my-model')).toHaveTextContent('my-model');
    expect(getByTestId('eisModelCardCategory-my-model-Embedding')).toBeInTheDocument();
    expect(getByTestId('eisModelCardCategory-my-model-LLM')).toBeInTheDocument();
    expect(getByTestId('eisModelCardProviderIcon-my-model')).toBeInTheDocument();
    expect(queryByTestId('eisModelCardMeta-my-model')).not.toBeInTheDocument();
  });

  it('omits a leading provider name from the model title', () => {
    const { getByTestId } = render(
      <ModelCard
        model={{
          ...baseModel,
          modelName: 'Anthropic Claude Opus 4.6',
          modelCreator: 'Anthropic',
        }}
        onClick={jest.fn()}
      />
    );

    expect(getByTestId('eisModelCardProvider-Anthropic Claude Opus 4.6')).toHaveTextContent(
      'Anthropic'
    );
    expect(getByTestId('eisModelCardName-Anthropic Claude Opus 4.6')).toHaveTextContent(
      'Claude Opus 4.6'
    );
  });

  it('renders fallback icon for an unknown creator', () => {
    const unknownModel: GroupedModel = {
      ...baseModel,
      modelCreator: 'UnknownCorp',
    };
    const { getByTestId } = render(<ModelCard model={unknownModel} onClick={jest.fn()} />);

    expect(getByTestId('eisModelCardProviderIcon-my-model')).toHaveAttribute(
      'data-euiicon-type',
      'machineLearningApp'
    );
  });

  describe('Preview badge', () => {
    it('renders the preview badge when model status is Preview', async () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.Preview,
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      expect(getByTestId('modelPreviewBadge-my-model')).toBeInTheDocument();
      fireEvent.mouseOver(getByTestId('modelPreviewBadge-my-model'));
      await waitFor(() => {
        expect(getByTestId('modelPreviewBadgeTooltip-my-model')).toHaveTextContent('Preview model');
        expect(getByTestId('modelPreviewBadgeTooltip-my-model')).toHaveTextContent(
          'This model is still in preview status and not recommended for production applications.'
        );
      });
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('does not render the preview badge when model status is GA', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('modelPreviewBadge-my-model')).not.toBeInTheDocument();
    });
  });

  describe('End of life row', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 2, 1, 12, 0, 0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not show a date when the model is not nearing or past end of life', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelMetadata: {
          heuristics: {
            release_date: '2025-01-10',
            end_of_life_date: '2026-06-01',
          },
        },
      };
      const { queryByTestId } = render(<ModelCard model={model} onClick={jest.fn()} />);
      expect(queryByTestId('eisModelCardMeta-my-model')).not.toBeInTheDocument();
      expect(queryByTestId('eisModelCardReleaseDateTooltip-my-model')).not.toBeInTheDocument();
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
    });

    it('shows nearing end-of-life for a deprecated model', async () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.Deprecated,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
            end_of_life_date: '2026-08-01',
          },
        },
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      const row = getByTestId('eisModelCardMeta-my-model');
      expect(row).toHaveTextContent('Nearing end-of-life: 2026-08-01');
      expect(getByTestId('eisModelCardMetaIcon-my-model')).toHaveAttribute(
        'data-euiicon-type',
        'warning'
      );
      fireEvent.mouseOver(getByTestId('eisModelCardMetaDate-my-model'));
      await waitFor(() => {
        expect(getByTestId('eisModelCardNearingEndOfLifeTooltip-my-model')).toHaveTextContent(
          'Model will be deprecated soon'
        );
        expect(getByTestId('eisModelCardNearingEndOfLifeTooltip-my-model')).toHaveTextContent(
          'This model will be deprecated on 2026-08-01. We recommend a newer model for optimal results.'
        );
      });
      expect(queryByTestId('modelDeprecatedBadge-my-model')).not.toBeInTheDocument();
    });

    it('shows end-of-life when the date has passed', async () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.DeprecatedEOL,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
            end_of_life_date: '2026-02-01',
          },
        },
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      const row = getByTestId('eisModelCardMeta-my-model');
      expect(row).toHaveTextContent('End-of-life: 2026-02-01');
      expect(getByTestId('eisModelCardMetaIcon-my-model')).toHaveAttribute(
        'data-euiicon-type',
        'error'
      );
      fireEvent.mouseOver(getByTestId('eisModelCardMetaDate-my-model'));
      await waitFor(() => {
        expect(getByTestId('eisModelCardEndOfLifeTooltip-my-model')).toHaveTextContent(
          'Model is no longer available'
        );
        expect(getByTestId('eisModelCardEndOfLifeTooltip-my-model')).toHaveTextContent(
          'This model was deprecated on 2026-02-01. We recommend a newer model for optimal results.'
        );
      });
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('does not show an end-of-life row when there is no date', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.DeprecatedEOL,
        modelMetadata: {
          heuristics: {
            status: 'deprecated',
          },
        },
      };
      const { queryByTestId } = render(<ModelCard model={model} onClick={jest.fn()} />);
      expect(queryByTestId('eisModelCardMeta-my-model')).not.toBeInTheDocument();
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('does not show an end-of-life row for a GA model with no date', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('eisModelCardMeta-my-model')).not.toBeInTheDocument();
    });
  });

  describe('Blocked badge', () => {
    it('renders the blocked badge when an endpoint is denied by region policy', async () => {
      const model: GroupedModel = {
        ...baseModel,
        endpoints: [
          {
            inference_id: 'blocked',
            task_type: 'chat_completion',
            service: 'elastic',
            service_settings: { model_id: 'my-model' },
            metadata: { denied_by_region_policy: true },
          },
        ],
      };
      const { getByTestId } = render(<ModelCard model={model} onClick={jest.fn()} />);
      expect(getByTestId('modelBlockedBadge-my-model')).toHaveTextContent('Blocked');
      fireEvent.mouseOver(getByTestId('modelBlockedBadge-my-model'));
      await waitFor(() => {
        expect(getByTestId('modelBlockedBadgeTooltip-my-model')).toHaveTextContent(
          'Blocked by region policy'
        );
        expect(getByTestId('modelBlockedBadgeTooltip-my-model')).toHaveTextContent(
          'This model is not available within your current region preferences.'
        );
      });
    });

    it('renders the blocked badge together with the end-of-life row', () => {
      const model: GroupedModel = {
        ...baseModel,
        modelStatus: EisModelStatus.DeprecatedEOL,
        modelMetadata: {
          heuristics: {
            end_of_life_date: '2020-01-01',
          },
        },
        endpoints: [
          {
            inference_id: 'blocked',
            task_type: 'chat_completion',
            service: 'elastic',
            service_settings: { model_id: 'my-model' },
            metadata: { denied_by_region_policy: true },
          },
        ],
      };
      const { getByTestId, queryByTestId } = render(
        <ModelCard model={model} onClick={jest.fn()} />
      );
      expect(getByTestId('modelBlockedBadge-my-model')).toBeInTheDocument();
      expect(getByTestId('eisModelCardMeta-my-model')).toHaveTextContent('End-of-life:');
      expect(queryByTestId('modelEolBadge-my-model')).not.toBeInTheDocument();
    });

    it('does not render the blocked badge when no endpoint is denied by region policy', () => {
      const { queryByTestId } = render(<ModelCard model={baseModel} onClick={jest.fn()} />);
      expect(queryByTestId('modelBlockedBadge-my-model')).not.toBeInTheDocument();
    });
  });
});
