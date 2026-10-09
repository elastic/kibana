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
  return {
    onClose,
    onCreateEsqlRule,
    onCreateThresholdRule,
    onCreateWithAgent,
    onBuildSequence,
    onBrowseClassic,
    ...render(
      <IntlProvider locale="en">
        <AlertingOnboardingModal
          onClose={onClose}
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateThresholdRule={onCreateThresholdRule}
          onCreateWithAgent={onCreateWithAgent}
          onBuildSequence={onBuildSequence}
          onBrowseClassic={onBrowseClassic}
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

  it('defaults to setup create pane with Your setup expanded in the right sidebar', () => {
    renderModal();

    expect(screen.getByTestId('alertingOnboardingModal')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingModalSidebar')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingModalMain')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav-setup')).toHaveAttribute('data-selected');
    expect(screen.getByTestId('alertingOnboardingCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingChecklist')).toBeInTheDocument();
    expect(screen.getByTestId('onboardingMeasureCreateSection')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingAdvantages')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingQueryPipeline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingNav-compare')).not.toBeInTheDocument();
  });

  it('switches the main pane when a sidebar nav item is selected', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-why'));
    expect(screen.getByTestId('alertingOnboardingAdvantages')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingCompareSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingNav-why')).toHaveAttribute('data-selected');
    expect(screen.queryByTestId('alertingOnboardingCreateSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingOnboardingChecklist')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-query'));
    expect(screen.getByTestId('alertingOnboardingQueryPipeline')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineExplainer')).toHaveAttribute(
      'data-force-expanded',
      'true'
    );
    expect(screen.getByTestId('queryPipelineExplainer')).toHaveAttribute('data-layout', 'canvas');

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-setup'));
    expect(screen.getByTestId('alertingOnboardingCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingChecklist')).toBeInTheDocument();
  });

  it('shows expandable advantage cards and Universal vs Classic on the Why Universal section', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-why'));
    expect(screen.getByTestId('alertingOnboardingAdvantage-query')).toHaveAttribute(
      'data-expanded'
    );
    expect(screen.getByTestId('alertingOnboardingAdvantageExpanded')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingSampleQuery')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingWhenUniversal')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingWhenClassic')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-shape'));
    expect(screen.getByTestId('alertingOnboardingAdvantage-shape')).toHaveAttribute(
      'data-expanded'
    );
    expect(screen.queryByTestId('alertingOnboardingSampleQuery')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingAdvantageExpanded')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-lifecycle'));
    expect(screen.getByTestId('alertingOnboardingAdvantage-lifecycle')).toHaveAttribute(
      'data-expanded'
    );
    expect(screen.getByTestId('alertingOnboardingLifecycleTimelineDemo')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingOnboardingAdvantage-lifecycle'));
    expect(screen.queryByTestId('alertingOnboardingAdvantageExpanded')).not.toBeInTheDocument();
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

  it('shows Classic rule count in the checklist when Classic rules exist', () => {
    renderModal({
      signalsOverride: {
        hasData: true,
        hasClassicRules: true,
        classicRulesCount: 12,
        isLoading: false,
      },
    });

    expect(screen.getByText(/12 Classic rules/i)).toBeInTheDocument();
  });

  it('closes and opens ES|QL create when the measure ES|QL card is clicked', () => {
    const { onClose, onCreateEsqlRule } = renderModal();

    fireEvent.click(screen.getByTestId('onboardingMeasureChooseEsql'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
  });

  it('closes and opens threshold create when the measure Threshold card is clicked', () => {
    const { onClose, onCreateThresholdRule } = renderModal();

    fireEvent.click(screen.getByTestId('onboardingMeasureChooseThreshold'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreateThresholdRule).toHaveBeenCalledTimes(1);
  });

  it('suggests Classic when an APM domain is selected', () => {
    const { onBrowseClassic, onClose } = renderModal();

    fireEvent.focus(screen.getByTestId('onboardingMeasureSearch'));
    fireEvent.click(screen.getByTestId('onboardingMeasureDomain-apm'));

    expect(screen.getByTestId('onboardingMeasureContinueClassic')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboardingMeasureContinueClassic'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBrowseClassic).toHaveBeenCalledWith('APM');
  });

  it('shows Coming soon as a badge on the migration callout', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingNav-why'));

    expect(screen.getByTestId('alertingOnboardingMigrationSoon')).toHaveTextContent(
      /Guided migration from Classic/
    );
    expect(screen.getByTestId('alertingOnboardingMigrationSoonBadge')).toHaveTextContent(
      'Coming soon'
    );
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

    fireEvent.click(screen.getByTestId('alertingOnboardingChecklistAction-data'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOnboardingNavigate).toHaveBeenCalledWith({});
  });

  it('starts Universal create when Rules step is clicked with no Classic rules', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('alertingOnboardingChecklistAction-classic'));

    expect(screen.getByTestId('alertingOnboardingCreateSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingChecklistAction-create')).toBeInTheDocument();
  });

  it('opens Why Universal for migration guidance when Classic rules exist', () => {
    renderModal({
      signalsOverride: {
        hasData: true,
        hasClassicRules: true,
        classicRulesCount: 3,
        isLoading: false,
      },
    });

    fireEvent.click(screen.getByTestId('alertingOnboardingChecklistAction-classic'));

    expect(screen.getByTestId('alertingOnboardingAdvantages')).toBeInTheDocument();
    expect(screen.getByTestId('alertingOnboardingMigrationSoon')).toBeInTheDocument();
  });
});
