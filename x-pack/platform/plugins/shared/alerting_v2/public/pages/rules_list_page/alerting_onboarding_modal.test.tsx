/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertingOnboardingModal } from './alerting_onboarding_modal';
import type { OnboardingSignals } from './use_onboarding_signals';

const mockNavigateToApp = jest.fn();
const mockOnboardingNavigate = jest.fn();

jest.mock('@kbn/core-di', () => ({
  PluginStart: (id: string) => id,
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: string) => {
    if (token === 'application') {
      return {
        getUrlForApp: (appId: string) => `/app/${appId}`,
        navigateToApp: mockNavigateToApp,
      };
    }
    if (token === 'share') {
      return {
        url: {
          locators: {
            get: () => ({
              navigate: mockOnboardingNavigate,
            }),
          },
        },
      };
    }
    return { basePath: { prepend: (path: string) => path } };
  },
  CoreStart: (id: string) => id,
}));

jest.mock('./use_onboarding_signals', () => ({
  useOnboardingSignals: () => ({
    hasData: true,
    hasClassicRules: false,
    classicRulesCount: 0,
    isLoading: false,
  }),
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  QueryPipelineExplainer: ({
    forceExpanded,
    layout,
  }: {
    forceExpanded?: boolean;
    layout?: string;
  }) => (
    <div
      data-test-subj="queryPipelineExplainer"
      data-force-expanded={String(!!forceExpanded)}
      data-layout={layout ?? 'stack'}
    >
      How a rule runs queries
    </div>
  ),
  HighlightedEsqlBlock: ({
    query,
    highlightSegment,
  }: {
    query: string;
    highlightSegment?: string;
  }) => (
    <pre data-test-subj="queryPipelineActiveQuery">
      <span data-test-subj="queryPipelineQueryHighlight">{highlightSegment ?? query}</span>
    </pre>
  ),
  DEMO_BASE_QUERY: 'FROM metrics-* | EVAL severity = "high" | KEEP host.name, severity',
  DEMO_SHAPE_HIGHLIGHT_SEGMENT: 'EVAL severity = "high"\n| KEEP host.name, severity',
}));

jest.mock('./onboarding_lifecycle_timeline_demo', () => ({
  OnboardingLifecycleTimelineDemo: () => (
    <div data-test-subj="alertingOnboardingLifecycleTimelineDemo">Lifecycle timeline demo</div>
  ),
}));

const readySignals: OnboardingSignals = {
  hasData: true,
  hasClassicRules: false,
  classicRulesCount: 0,
  isLoading: false,
};

const renderModal = (
  props: Partial<React.ComponentProps<typeof AlertingOnboardingModal>> = {}
) => {
  const onClose = props.onClose ?? jest.fn();
  const onCreateEsqlRule = props.onCreateEsqlRule ?? jest.fn();
  const onCreateThresholdRule = props.onCreateThresholdRule ?? jest.fn();
  const onCreateWithAgent = props.onCreateWithAgent ?? jest.fn();
  const onBuildSequence = props.onBuildSequence ?? jest.fn();
  const onBrowseClassic = props.onBrowseClassic ?? jest.fn();
  const onCreateActionPolicy = props.onCreateActionPolicy ?? jest.fn();
  return {
    onClose,
    onCreateEsqlRule,
    onCreateThresholdRule,
    onCreateWithAgent,
    onBuildSequence,
    onBrowseClassic,
    onCreateActionPolicy,
    ...render(
      <IntlProvider locale="en">
        <AlertingOnboardingModal
          onClose={onClose}
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateThresholdRule={onCreateThresholdRule}
          onCreateWithAgent={onCreateWithAgent}
          onBuildSequence={onBuildSequence}
          onBrowseClassic={onBrowseClassic}
          onCreateActionPolicy={onCreateActionPolicy}
          documentationHref="https://docs.test/alerting"
          signalsOverride={props.signalsOverride ?? readySignals}
        />
      </IntlProvider>
    ),
  };
};

describe('AlertingOnboardingModal', () => {
  beforeEach(() => {
    mockNavigateToApp.mockReset();
    mockOnboardingNavigate.mockReset();
  });

  it('defaults to What\'s new with advantages in the main pane', () => {
    renderModal();

    expect(screen.getByTestId('alertingOnboardingModal')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingModalSidebar')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingModalMain')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav-why')).toHaveAttribute('data-selected');
    expect(screen.getByTestId('alertingOnboardingNav-why')).toHaveTextContent(
      "What's new on Kibana Universal Alerting"
    );
    expect(screen.getByTestId('alertingOnboardingAdvantages')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingQueryPipeline')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingCreateSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingChecklist')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingNav-compare')).not.toBeInTheDocument();
  });

  it('switches the main pane when a sidebar nav item is selected', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    expect(screen.getByTestId('alertingOnboardingCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingChecklist')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav-setup')).toHaveAttribute('data-selected');
    expect(screen.queryByTestId('alertingOnboardingAdvantages')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-why'));
    expect(screen.getByTestId('alertingOnboardingAdvantages')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingCompareSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav-why')).toHaveAttribute('data-selected');
    expect(screen.queryByTestId('alertingOnboardingCreateSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingChecklist')).not.toBeInTheDocument();
  });

  it('shows expandable advantage cards and embeds query power in Any condition', () => {
    renderModal();

    expect(screen.getByTestId('alertingOnboardingAdvantage-query')).toHaveAttribute(
      'data-expanded'
    );
    expect(screen.getByTestId('alertingOnboardingAdvantageExpanded')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingQueryPipeline')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineExplainer')).toHaveAttribute(
      'data-force-expanded',
      'true'
    );
    expect(screen.getByTestId('queryPipelineExplainer')).toHaveAttribute('data-layout', 'split');
    expect(screen.getByTestId('alertingOnboardingWhenUniversal')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingWhenClassic')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-alertAsData'));
    expect(screen.getByTestId('alertingOnboardingAdvantage-alertAsData')).toHaveAttribute(
      'data-expanded'
    );
    expect(screen.queryByTestId('alertingOnboardingQueryPipeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsData')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-shape')).toHaveAttribute(
      'data-selected'
    );

    fireEvent.click(screen.getByTestId('alertingOnboardingAlertAsDataCard-lifecycle'));
    expect(screen.getByTestId('alertingOnboardingLifecycleTimelineDemo')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-alertAsData'));
    expect(screen.queryByTestId('alertingOnboardingAdvantageExpanded')).not.toBeInTheDocument();
  });

  it('merges shape, lifecycle, Discover, and triage into one accordion', () => {
    renderModal();

    expect(screen.queryByTestId('alertingOnboardingAdvantage-shapeLifecycle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingAdvantage-data')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingAdvantage-inbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-alertAsData'));
    expect(screen.getByTestId('alertingOnboardingAlertAsData')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-shape')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsDataShapeQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineQueryHighlight')).toHaveTextContent('EVAL severity');
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-lifecycle')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-discover')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-triage')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAlertAsDataCard-triage'));
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-triage')).toHaveAttribute(
      'data-selected'
    );
    expect(screen.getByTestId('alertingOnboardingAlertAsDataCard-shape')).not.toHaveAttribute(
      'data-selected'
    );
  });

  it('shows Add data in the header when no data views', () => {
    renderModal({
      signalsOverride: {
        hasData: false,
        hasClassicRules: false,
        classicRulesCount: 0,
        isLoading: false,
      },
    });

    expect(screen.getByTestId('alertingOnboardingModalAddData')).toBeInTheDocument();
  });

  it('shows a compact Classic rules status check when Classic rules exist', () => {
    renderModal({
      signalsOverride: {
        hasData: true,
        hasClassicRules: true,
        classicRulesCount: 12,
        isLoading: false,
      },
    });

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    expect(screen.getByText('Classic rules')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingChecklistAction-classic')).not.toBeInTheDocument();
  });

  it('keeps Data is available compact when data is ready', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    expect(screen.getByText('Data is available')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingChecklistAction-data')).not.toBeInTheDocument();
  });

  it('closes and opens ES|QL create when the measure ES|QL card is clicked', () => {
    const { onClose, onCreateEsqlRule } = renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    fireEvent.click(screen.getByTestId('onboardingMeasureChooseEsql'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
  });

  it('closes and opens threshold create when the measure Threshold card is clicked', () => {
    const { onClose, onCreateThresholdRule } = renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    fireEvent.click(screen.getByTestId('onboardingMeasureChooseThreshold'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreateThresholdRule).toHaveBeenCalledTimes(1);
  });

  it('suggests Classic when an APM domain is selected', () => {
    const { onBrowseClassic, onClose } = renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    fireEvent.focus(screen.getByTestId('onboardingMeasureSearch'));
    fireEvent.click(screen.getByTestId('onboardingMeasureDomain-apm'));

    expect(screen.getByTestId('onboardingMeasureContinueClassic')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboardingMeasureContinueClassic'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBrowseClassic).toHaveBeenCalledWith('APM');
  });

  it('closes from the back control', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingModalBack'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens Observability onboarding when Add data is clicked and there is no data', () => {
    const { onClose } = renderModal({
      signalsOverride: {
        hasData: false,
        hasClassicRules: false,
        classicRulesCount: 0,
        isLoading: false,
      },
    });

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    fireEvent.click(screen.getByTestId('alertingOnboardingChecklistAction-data'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOnboardingNavigate).toHaveBeenCalledWith({});
  });

  it('shows Start with Kibana Universal Alerting and both create paths', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    expect(screen.getAllByText('Start with Kibana Universal Alerting').length).toBeGreaterThan(0);
    expect(screen.getByTestId('alertingOnboardingChecklistAction-create')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('onboardingMeasureCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingCreateActionPolicy')).toBeInTheDocument();
  });

  it('closes and opens action policy create from the notification path', () => {
    const { onClose, onCreateActionPolicy } = renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    fireEvent.click(screen.getByTestId('alertingOnboardingCreateActionPolicy'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreateActionPolicy).toHaveBeenCalledTimes(1);
  });
});
