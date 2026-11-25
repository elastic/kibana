/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { EditableEndpointsList } from './editable_endpoints_list';
import type {
  InferenceFeatureResponse as InferenceFeatureConfig,
  ReasoningEffortLevel,
} from '../../../common/types';
import { EisModelStatus, type EndpointDeprecationInfo, type EndpointEfforts } from '../../types';
import type { EndpointDisplay } from './types';
import type { GlobalDefaultLockedRowProps } from './global_default_locked_row';

jest.mock('./add_model_popover', () => ({
  AddModelPopover: ({ onAdd }: { onAdd: (id: string) => void }) => (
    <button data-test-subj="add-model-button" onClick={() => onAdd('ep-2')} type="button">
      Add
    </button>
  ),
}));
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiDragDropContext: ({
      onDragEnd,
      children,
    }: {
      onDragEnd: (result: {
        source: { index: number };
        destination: { index: number } | null;
      }) => void;
      children: React.ReactNode;
    }) => (
      <actual.EuiDragDropContext onDragEnd={onDragEnd}>
        {children}
        <button
          data-test-subj="drag-first-to-second"
          onClick={() => onDragEnd({ source: { index: 0 }, destination: { index: 1 } })}
          type="button"
        >
          Drag
        </button>
      </actual.EuiDragDropContext>
    ),
  };
});

const endpointDisplayMap = new Map<string, EndpointDisplay>([
  ['ep-1', { icon: 'logoElastic', label: 'Claude' }],
  ['ep-2', { icon: 'logoElastic', label: 'Claude 2' }],
  ['ep-3', { icon: 'logoOpenAI', label: 'GPT-4o' }],
  ['ep-4', { icon: 'logoOpenAI', label: 'GPT-4o-mini' }],
  ['ep-5', { icon: 'logoOpenAI', label: 'GPT-3.5-turbo' }],
  ['ep-6', { icon: 'logoOpenAI', label: 'o1' }],
]);

const feature: InferenceFeatureConfig = {
  featureId: 'test_feature',
  parentFeatureId: 'parent',
  featureName: 'Test Feature',
  featureDescription: 'A test feature',
  taskType: 'chat_completion',
  recommendedEndpoints: ['ep-1'],
  isBeta: false,
  isTechPreview: false,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('EditableEndpointsList', () => {
  const onEndpointsChange = jest.fn();
  const onEffortsChange = jest.fn();
  const onExpand = jest.fn();
  const onCopyTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderList = ({
    endpointIds,
    overrides,
    efforts = {},
    invalidEndpointIds = new Set(),
    deprecatedEndpointsMap = new Map(),
    globalDefaultRow,
    canManage = true,
    hasOtherSubFeatures = false,
    isExpanded = false,
    supportedEffortLevels = new Map(),
  }: {
    endpointIds: string[];
    overrides?: Partial<InferenceFeatureConfig>;
    efforts?: EndpointEfforts;
    invalidEndpointIds?: Set<string>;
    deprecatedEndpointsMap?: Map<string, EndpointDeprecationInfo>;
    globalDefaultRow?: Omit<GlobalDefaultLockedRowProps, 'featureId'>;
    canManage?: boolean;
    hasOtherSubFeatures?: boolean;
    isExpanded?: boolean;
    supportedEffortLevels?: Map<string, ReasoningEffortLevel[]>;
  }) =>
    render(
      <Wrapper>
        <EditableEndpointsList
          featureId={feature.featureId}
          feature={{ ...feature, ...overrides }}
          endpointIds={endpointIds}
          efforts={efforts}
          endpointDisplayMap={endpointDisplayMap}
          supportedEffortLevels={supportedEffortLevels}
          invalidEndpointIds={invalidEndpointIds}
          deprecatedEndpointsMap={deprecatedEndpointsMap}
          showGlobalDefaultRow={globalDefaultRow !== undefined}
          globalDefaultRow={globalDefaultRow}
          canManage={canManage}
          hasOtherSubFeatures={hasOtherSubFeatures}
          isExpanded={isExpanded}
          listRef={createRef<HTMLDivElement>()}
          onExpand={onExpand}
          onCopyTo={onCopyTo}
          onEndpointsChange={onEndpointsChange}
          onEffortsChange={onEffortsChange}
        />
      </Wrapper>
    );

  it('renders all endpoint rows within collapsed count', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2'] });

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-ep-2')).toBeInTheDocument();
  });

  it('hides endpoints beyond collapsed count', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'] });

    expect(screen.getByTestId('endpoint-row-ep-5')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-row-ep-6')).not.toBeInTheDocument();
  });

  it('renders all endpoint rows when expanded', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'], isExpanded: true });

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-ep-6')).toBeInTheDocument();
  });

  it('disables remove button when only one endpoint', () => {
    renderList({ endpointIds: ['ep-1'] });

    expect(screen.getByTestId('remove-endpoint-ep-1')).toBeDisabled();
  });

  it('shows remove buttons when multiple endpoints', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2'] });

    expect(screen.getByTestId('remove-endpoint-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('remove-endpoint-ep-2')).toBeInTheDocument();
  });

  it('shows "Show N more" when endpoints exceed collapsed count', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'] });

    expect(screen.getByTestId('show-more-test_feature')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-row-ep-6')).not.toBeInTheDocument();
  });

  it('calls onExpand on "Show more" click', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'] });

    fireEvent.click(screen.getByTestId('show-more-test_feature'));

    expect(onExpand).toHaveBeenCalled();
  });

  it('hides "Show more" when expanded', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'], isExpanded: true });

    expect(screen.queryByTestId('show-more-test_feature')).not.toBeInTheDocument();
  });

  it('hides add-model button when collapsed', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'] });

    expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
  });

  it('shows add-model button when not collapsed and under max', () => {
    renderList({ endpointIds: ['ep-1'], overrides: { maxNumberOfEndpoints: 3 } });

    expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
  });

  it('hides add-model button when maxNumberOfEndpoints reached', () => {
    renderList({ endpointIds: ['ep-1'], overrides: { maxNumberOfEndpoints: 1 } });

    expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
  });

  it('adds endpoint via popover when add button clicked', () => {
    renderList({ endpointIds: ['ep-1'] });

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1', 'ep-2']);
  });

  it('clicking remove calls onEndpointsChange without the removed endpoint', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2'] });

    fireEvent.click(screen.getByTestId('remove-endpoint-ep-1'));

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-2']);
  });

  it('reorders models on drag and drop', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2', 'ep-3'] });

    fireEvent.click(screen.getByTestId('drag-first-to-second'));

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-2', 'ep-1', 'ep-3']);
  });

  it('renders visible Copy to beside add model when other sub-features exist and the toggle is OFF', () => {
    renderList({ endpointIds: ['ep-2'], hasOtherSubFeatures: true });

    expect(screen.getByTestId('copy-to-test_feature')).toBeInTheDocument();
  });

  it('calls onCopyTo on Copy to click', () => {
    renderList({ endpointIds: ['ep-2'], hasOtherSubFeatures: true });

    fireEvent.click(screen.getByTestId('copy-to-test_feature'));

    expect(onCopyTo).toHaveBeenCalled();
  });

  it('disables Copy to when no models are assigned', () => {
    renderList({ endpointIds: [], hasOtherSubFeatures: true });

    expect(screen.getByTestId('copy-to-test_feature')).toBeDisabled();
  });

  it('does not render Copy to when there are no other sub-features', () => {
    renderList({ endpointIds: ['ep-2'] });

    expect(screen.queryByTestId('copy-to-test_feature')).not.toBeInTheDocument();
  });

  it('hides add model, Copy to, and remove controls without manage permission', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2'], canManage: false, hasOtherSubFeatures: true });

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('copy-to-test_feature')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-endpoint-ep-1')).not.toBeInTheDocument();
  });

  it('shows a warning indicator on the row of an invalid endpoint', () => {
    renderList({ endpointIds: ['ep-1', 'ep-2'], invalidEndpointIds: new Set(['ep-1']) });

    expect(screen.getByTestId('endpoint-row-ep-1')).toHaveTextContent(
      'Inference endpoint Claude is no longer available'
    );
    expect(screen.getByTestId('endpoint-row-ep-2')).not.toHaveTextContent('is no longer available');
  });

  it('renders the deprecated badge on the row of a deprecated endpoint', () => {
    renderList({
      endpointIds: ['ep-1', 'ep-2'],
      deprecatedEndpointsMap: new Map([
        [
          'ep-2',
          {
            name: 'Claude 2',
            status: EisModelStatus.Deprecated,
            metadata: {
              heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
            },
          },
        ],
      ]),
    });

    expect(screen.getByTestId('modelDeprecatedBadge-ep-2')).toBeInTheDocument();
    expect(screen.queryByTestId('modelDeprecatedBadge-ep-1')).not.toBeInTheDocument();
  });

  it('renders the global default row when no models are assigned', () => {
    renderList({
      endpointIds: [],
      globalDefaultRow: {
        icon: 'logoOpenAI',
        label: 'GPT-4o',
        showBadge: true,
        globalDefaultId: 'ep-3',
      },
    });

    expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    expect(screen.queryByTestId('no-models-available-test_feature')).not.toBeInTheDocument();
  });

  it('shows No models available when no models are assigned and there is no global default row', () => {
    renderList({ endpointIds: [] });

    expect(screen.getByTestId('no-models-available-test_feature')).toHaveTextContent(
      'No models available'
    );
  });

  describe('reasoning effort', () => {
    const supportedEffortLevels = new Map<string, ReasoningEffortLevel[]>([
      ['ep-1', ['low', 'medium', 'high']],
    ]);

    it('sets an effort for the model', () => {
      renderList({
        endpointIds: ['ep-1', 'ep-2'],
        efforts: { 'ep-2': 'low' },
        supportedEffortLevels,
      });

      fireEvent.click(screen.getByTestId('add-effort-ep-1'));
      fireEvent.click(screen.getByTestId('reasoningEffort-medium'));

      expect(onEffortsChange).toHaveBeenCalledWith('test_feature', {
        'ep-1': 'medium',
        'ep-2': 'low',
      });
    });

    it('removes the effort customization for the model', () => {
      renderList({
        endpointIds: ['ep-1', 'ep-2'],
        efforts: { 'ep-1': 'high', 'ep-2': 'low' },
        supportedEffortLevels,
      });

      fireEvent.click(screen.getByTestId('effort-badge-ep-1'));
      fireEvent.click(screen.getByTestId('remove-effort-customization'));

      expect(onEffortsChange).toHaveBeenCalledWith('test_feature', { 'ep-2': 'low' });
    });
  });
});
