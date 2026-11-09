/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { EisInferenceEndpoint } from '../../../common/types';
import { ModelDetailFlyout } from './model_detail_flyout';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const MODEL_ID = 'test-model';

const createEndpoint = (overrides: Partial<EisInferenceEndpoint> = {}): EisInferenceEndpoint => ({
  inference_id: 'my-endpoint',
  task_type: 'text_embedding',
  service: 'elastic',
  service_settings: { model_id: MODEL_ID },
  ...overrides,
});

describe('ModelDetailFlyout', () => {
  const onClose = jest.fn();
  const onSaveEndpoint = jest.fn();
  const onDeleteEndpoint = jest.fn();
  const onCopyEndpointId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: {} });
  });

  const renderFlyout = (
    modelId = MODEL_ID,
    allEndpoints: EisInferenceEndpoint[] = [createEndpoint()]
  ) =>
    render(
      <ModelDetailFlyout
        modelId={modelId}
        allEndpoints={allEndpoints}
        onClose={onClose}
        onSaveEndpoint={onSaveEndpoint}
        onDeleteEndpoint={onDeleteEndpoint}
        onCopyEndpointId={onCopyEndpointId}
      />
    );

  it('renders flyout with model_id as header when no display metadata', () => {
    renderFlyout();
    expect(screen.getByTestId('modelDetailFlyoutTitle')).toHaveTextContent(MODEL_ID);
  });

  describe('header with display metadata', () => {
    const anthropicEndpoint = {
      ...createEndpoint(),
      metadata: { display: { name: 'Anthropic Claude Opus 4.5', model_creator: 'Anthropic' } },
    } as unknown as EisInferenceEndpoint;

    it('renders the model name without the provider prefix', () => {
      renderFlyout(MODEL_ID, [anthropicEndpoint]);
      expect(screen.getByTestId('modelDetailFlyoutTitle')).toHaveTextContent(/^Claude Opus 4\.5$/);
    });

    it('renders the provider name', () => {
      renderFlyout(MODEL_ID, [anthropicEndpoint]);
      expect(screen.getByTestId('modelDetailFlyoutProvider')).toHaveTextContent('Anthropic');
    });

    it('renders the provider icon', () => {
      renderFlyout(MODEL_ID, [anthropicEndpoint]);
      expect(screen.getByTestId('modelDetailFlyoutProviderIcon')).not.toHaveAttribute(
        'data-euiicon-type',
        'machineLearningApp'
      );
    });
  });

  it('renders a fallback provider icon for an unknown provider', () => {
    renderFlyout();
    expect(screen.getByTestId('modelDetailFlyoutProviderIcon')).toHaveAttribute(
      'data-euiicon-type',
      'machineLearningApp'
    );
  });

  it('falls back to Unknown for model author when no creator metadata', () => {
    renderFlyout();
    expect(screen.getByTestId('modelDetailFlyoutProvider')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('flyoutModelDetails')).toHaveTextContent('Unknown');
  });

  it.each([
    ['preview', { status: 'preview' }, `modelPreviewBadge-${MODEL_ID}`],
    ['deprecated', { status: 'deprecated' }, `modelDeprecatedBadge-${MODEL_ID}`],
    [
      'end-of-life',
      { status: 'deprecated', end_of_life_date: '2020-01-01' },
      `modelEolBadge-${MODEL_ID}`,
    ],
  ])('does not render header badges when the model is %s', (_status, heuristics, badgeTestId) => {
    const endpoints = [
      createEndpoint({ inference_id: 'ep-1', task_type: 'text_embedding' }),
      createEndpoint({
        inference_id: 'ep-2',
        task_type: 'completion',
        metadata: { heuristics },
      }),
    ] as unknown as EisInferenceEndpoint[];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.queryByTestId('flyoutTaskBadges')).not.toBeInTheDocument();
    expect(screen.queryByTestId(badgeTestId)).not.toBeInTheDocument();
  });

  it('filters endpoints by modelId', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'ep-match', service_settings: { model_id: MODEL_ID } }),
      createEndpoint({
        inference_id: 'ep-other',
        service_settings: { model_id: 'other-model' },
      }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getByText('ep-match')).toBeInTheDocument();
    expect(screen.queryByText('ep-other')).not.toBeInTheDocument();
  });

  it('renders all matching endpoints', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'endpoint-a' }),
      createEndpoint({ inference_id: 'endpoint-b' }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getByText('endpoint-a')).toBeInTheDocument();
    expect(screen.getByText('endpoint-b')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('modelDetailFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the EIS documentation link', () => {
    renderFlyout();

    expect(screen.getByTestId('modelDetailFlyoutViewEisDocumentationLink')).toHaveTextContent(
      'View EIS documentation'
    );
  });

  describe('region options', () => {
    const endpointWithRegions = createEndpoint({
      metadata: { regions: [{ csp: 'aws', region: 'us-east-1', geo: 'us' }] },
    });

    it('renders geography and region badges when the endpoint has region metadata', () => {
      renderFlyout(MODEL_ID, [endpointWithRegions]);

      expect(screen.getByTestId('flyoutRegionOptions')).toBeInTheDocument();
      expect(screen.getByTestId('flyoutRegionOption-geo-us')).toHaveTextContent('North America');
      expect(screen.getByTestId('flyoutRegionOption-region-aws-us-east-1')).toHaveTextContent(
        'us-east-1 - AWS'
      );
    });

    it('renders only the geography badge when the endpoint has geo-only metadata', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { regions: [{ geo: 'us' }] },
        }),
      ]);

      expect(screen.getByTestId('flyoutRegionOptions').textContent).toBe('North America');
    });

    it('renders one badge per region when several endpoints share it', () => {
      renderFlyout(MODEL_ID, [
        endpointWithRegions,
        createEndpoint({
          inference_id: 'ep-2',
          metadata: { regions: [{ csp: 'aws', region: 'us-east-1', geo: 'us' }] },
        }),
      ]);

      expect(screen.getAllByTestId('flyoutRegionOption-region-aws-us-east-1')).toHaveLength(1);
      expect(screen.getAllByTestId('flyoutRegionOption-geo-us')).toHaveLength(1);
    });

    it('still renders every region option when the model is denied by region policy', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: {
            denied_by_region_policy: true,
            regions: [
              { csp: 'aws', region: 'us-east-1', geo: 'us' },
              { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
            ],
          },
        }),
      ]);

      expect(screen.getByTestId('modelDetailFlyoutRegionUnavailableCallout')).toBeInTheDocument();
      expect(screen.getByTestId('flyoutRegionOption-geo-eu')).toHaveTextContent('Europe');
      expect(screen.getByTestId('flyoutRegionOption-geo-us')).toHaveTextContent('North America');
      expect(screen.getByTestId('flyoutRegionOption-region-aws-eu-west-1')).toHaveTextContent(
        'eu-west-1 - AWS'
      );
      expect(screen.getByTestId('flyoutRegionOption-region-aws-us-east-1')).toHaveTextContent(
        'us-east-1 - AWS'
      );
    });

    it('says region options are not available when the endpoint has no region metadata', () => {
      renderFlyout();

      expect(screen.getByTestId('flyoutRegionOptionsUnavailable')).toHaveTextContent(
        'Region options are not available for this model.'
      );
      expect(screen.queryByTestId('flyoutRegionOptions')).not.toBeInTheDocument();
    });
  });

  describe('region preferences unavailable callout', () => {
    const deniedEndpoint = createEndpoint({ metadata: { denied_by_region_policy: true } });

    it('shows the callout when any endpoint is denied by region policy', () => {
      renderFlyout(MODEL_ID, [
        deniedEndpoint,
        createEndpoint({
          inference_id: 'ep-custom',
          metadata: { denied_by_region_policy: false },
        }),
      ]);

      const callout = screen.getByTestId('modelDetailFlyoutRegionUnavailableCallout');
      expect(callout).toHaveTextContent('Model not available for use');
      expect(screen.getByTestId('modelDetailFlyoutViewDetailsButton')).toBeInTheDocument();
    });

    it('hides the callout when denied_by_region_policy is missing', () => {
      renderFlyout();

      expect(
        screen.queryByTestId('modelDetailFlyoutRegionUnavailableCallout')
      ).not.toBeInTheDocument();
    });

    it('hides the callout when only a different model is denied by region policy', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint(),
        createEndpoint({
          inference_id: 'ep-other',
          service_settings: { model_id: 'other-model' },
          metadata: { denied_by_region_policy: true },
        }),
      ]);

      expect(
        screen.queryByTestId('modelDetailFlyoutRegionUnavailableCallout')
      ).not.toBeInTheDocument();
    });
  });

  describe('preview and end-of-life callouts', () => {
    it('shows the preview callout when the model is in preview', () => {
      renderFlyout(MODEL_ID, [createEndpoint({ metadata: { heuristics: { status: 'preview' } } })]);

      const callout = screen.getByTestId('modelDetailFlyoutPreviewCallout');
      expect(callout).toHaveTextContent(
        'Model is still in Technical Preview and not recommended for production use.'
      );
      expect(screen.queryByTestId('modelDetailFlyoutEolCallout')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('modelDetailFlyoutRegionUnavailableCallout')
      ).not.toBeInTheDocument();
    });

    it('hides the preview callout when the model is not in preview', () => {
      renderFlyout();

      expect(screen.queryByTestId('modelDetailFlyoutPreviewCallout')).not.toBeInTheDocument();
    });

    it('shows the end-of-life callout when the model has reached end of life', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' } },
        }),
      ]);

      const callout = screen.getByTestId('modelDetailFlyoutEolCallout');
      expect(callout).toHaveTextContent('Model not available for use');
      expect(screen.getByTestId('modelDetailFlyoutEolViewDetailsButton')).toHaveTextContent(
        'View details'
      );
      expect(screen.queryByTestId('modelDetailFlyoutPreviewCallout')).not.toBeInTheDocument();
    });

    it('hides the end-of-life callout when the model has not reached end of life', () => {
      renderFlyout(MODEL_ID, [createEndpoint({ metadata: { heuristics: { status: 'ga' } } })]);

      expect(screen.queryByTestId('modelDetailFlyoutEolCallout')).not.toBeInTheDocument();
    });

    it('shows the region callout instead of preview when the model is also blocked', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { heuristics: { status: 'preview' }, denied_by_region_policy: true },
        }),
      ]);

      expect(screen.getByTestId('modelDetailFlyoutRegionUnavailableCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('modelDetailFlyoutPreviewCallout')).not.toBeInTheDocument();
    });

    it('shows the region callout instead of end-of-life when the model is also blocked', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: {
            heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' },
            denied_by_region_policy: true,
          },
        }),
      ]);

      expect(screen.getByTestId('modelDetailFlyoutRegionUnavailableCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('modelDetailFlyoutEolCallout')).not.toBeInTheDocument();
    });
  });

  describe('release and end-of-life dates', () => {
    const releaseLabel = 'Release date';
    const eolLabel = 'End-of-life date';

    const valueForLabel = (label: string) => {
      const dt = screen.getByText(label);
      return dt.nextElementSibling;
    };

    it('renders both formatted dates when metadata has release_date and end_of_life_date', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: {
          heuristics: {
            release_date: '2025-01-10',
            end_of_life_date: '2026-04-15',
          },
        },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      expect(valueForLabel(releaseLabel)).toHaveTextContent('2025-01-10');
      expect(valueForLabel(eolLabel)).toHaveTextContent('2026-04-15');
    });

    it('renders -- for both dates when metadata is absent', () => {
      renderFlyout();

      expect(valueForLabel(releaseLabel)).toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).toHaveTextContent('--');
    });

    it('renders -- for both dates when metadata heuristics has neither date', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: { heuristics: { status: 'ga' } },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      expect(valueForLabel(releaseLabel)).toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).toHaveTextContent('--');
    });

    it('renders release_date and -- for EOL when only release_date is present', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: { heuristics: { release_date: '2025-01-10' } },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      expect(valueForLabel(releaseLabel)).toHaveTextContent('2025-01-10');
      expect(valueForLabel(eolLabel)).toHaveTextContent('--');
    });

    it('renders end_of_life_date and -- for release when only end_of_life_date is present', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: { heuristics: { end_of_life_date: '2026-04-15' } },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      expect(valueForLabel(releaseLabel)).toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).toHaveTextContent('2026-04-15');
    });
  });

  describe('data retention', () => {
    it('renders Zero Data Retention when properties include zero-data-retention', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { heuristics: { properties: ['zero-data-retention'] } },
        }),
      ]);

      expect(screen.getByTestId('modelDetailFlyoutDataRetentionBadge')).toHaveTextContent(
        'Zero Data Retention'
      );
      expect(screen.queryByTestId('modelDetailFlyoutDataRetentionTooltip')).not.toBeInTheDocument();
    });

    it('renders Retains data and a tooltip when metadata has no zero-data-retention property', async () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { heuristics: { properties: ['multilingual'] } },
        }),
      ]);

      const badge = screen.getByTestId('modelDetailFlyoutDataRetentionBadge');
      expect(badge).toHaveTextContent('Data retained by provider');
      expect(badge).not.toHaveTextContent('days');
      expect(screen.queryByTestId('modelDetailFlyoutDataRetentionTooltip')).not.toBeInTheDocument();

      fireEvent.mouseOver(badge);

      await waitFor(() => {
        expect(screen.getByTestId('modelDetailFlyoutDataRetentionTooltip')).toHaveTextContent(
          'The provider of this model retains the data used with it for a period of time. Your inputs are not used to train the models. Refer to the provider for more information on their policy.'
        );
      });
    });

    it('renders Retains data when metadata has no properties list', () => {
      renderFlyout(MODEL_ID, [
        createEndpoint({
          metadata: { heuristics: { status: 'ga' } },
        }),
      ]);

      expect(screen.getByTestId('modelDetailFlyoutDataRetentionBadge')).toHaveTextContent(
        'Data retained by provider'
      );
    });

    it('renders Retains data when metadata is absent', () => {
      renderFlyout();

      expect(screen.getByTestId('modelDetailFlyoutDataRetentionBadge')).toHaveTextContent(
        'Data retained by provider'
      );
    });
  });
});
