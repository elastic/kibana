/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { EisInferenceEndpoint } from '../../../common/types';
import { ModelDetailFlyout } from './model_detail_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { INFERENCE_PREFERENCES_FEATURE_FLAG_ID } from '../../../common/constants';

jest.mock('../../hooks/use_kibana');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
}));

const mockUseUiSetting = useUiSetting as jest.Mock;
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
    mockUseUiSetting.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === INFERENCE_PREFERENCES_FEATURE_FLAG_ID) return false;
      return defaultValue;
    });
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
    expect(screen.getByText(MODEL_ID)).toBeInTheDocument();
  });

  it('renders display name from metadata when available', () => {
    const endpoint = {
      ...createEndpoint(),
      metadata: { display: { name: 'Anthropic Claude Opus 4.5', model_creator: 'Anthropic' } },
    } as unknown as EisInferenceEndpoint;
    renderFlyout(MODEL_ID, [endpoint]);

    expect(screen.getByText('Anthropic Claude Opus 4.5')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('falls back to Unknown for model author when no creator metadata', () => {
    renderFlyout();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders task type badges in header', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'ep-1', task_type: 'text_embedding' }),
      createEndpoint({ inference_id: 'ep-2', task_type: 'completion' }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getAllByText('text_embedding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('completion').length).toBeGreaterThanOrEqual(1);
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

  it('renders documentation link', () => {
    renderFlyout();
    expect(screen.getByText('View documentation')).toBeInTheDocument();
  });

  describe('model status badge', () => {
    it('renders the EOL badge when metadata has an end_of_life_date in the past', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: {
          heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' },
        },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      const badges = screen.getByTestId('flyoutTaskBadges');
      expect(within(badges).getByTestId(`modelEolBadge-${MODEL_ID}`)).toBeInTheDocument();
    });

    it('renders the deprecated badge when metadata has status', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: {
          heuristics: { status: 'deprecated' },
        },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      const badges = screen.getByTestId('flyoutTaskBadges');
      expect(within(badges).getByTestId(`modelDeprecatedBadge-${MODEL_ID}`)).toBeInTheDocument();
    });

    it('renders the preview badge when metadata status is preview', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: { heuristics: { status: 'preview' } },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      const badges = screen.getByTestId('flyoutTaskBadges');
      expect(within(badges).getByTestId(`modelPreviewBadge-${MODEL_ID}`)).toBeInTheDocument();
    });

    it('renders no status badge when endpoint has no metadata', () => {
      renderFlyout();

      expect(screen.queryByTestId(`modelPreviewBadge-${MODEL_ID}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`modelDeprecatedBadge-${MODEL_ID}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`modelEolBadge-${MODEL_ID}`)).not.toBeInTheDocument();
    });
  });

  describe('region badges', () => {
    const endpointWithRegions = {
      ...createEndpoint(),
      metadata: {
        regions: [{ csp: 'aws', region: 'us-east-1', geo: 'us' }],
      },
    } as unknown as EisInferenceEndpoint;

    it('renders region badges when FF is enabled and endpoint has region metadata', () => {
      mockUseUiSetting.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === INFERENCE_PREFERENCES_FEATURE_FLAG_ID) return true;
        return defaultValue;
      });
      renderFlyout(MODEL_ID, [endpointWithRegions]);

      expect(screen.getByTestId('flyoutRegionBadges')).toBeInTheDocument();
      expect(screen.getByTestId('flyoutRegionBadge-us')).toBeInTheDocument();
    });

    it('does not render region badges when FF is disabled', () => {
      renderFlyout(MODEL_ID, [endpointWithRegions]);

      expect(screen.queryByTestId('flyoutRegionBadges')).not.toBeInTheDocument();
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

      expect(valueForLabel(releaseLabel)).not.toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).not.toHaveTextContent('--');
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

      expect(valueForLabel(releaseLabel)).not.toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).toHaveTextContent('--');
    });

    it('renders end_of_life_date and -- for release when only end_of_life_date is present', () => {
      const endpoint = {
        ...createEndpoint(),
        metadata: { heuristics: { end_of_life_date: '2026-04-15' } },
      } as unknown as EisInferenceEndpoint;
      renderFlyout(MODEL_ID, [endpoint]);

      expect(valueForLabel(releaseLabel)).toHaveTextContent('--');
      expect(valueForLabel(eolLabel)).not.toHaveTextContent('--');
    });
  });
});
