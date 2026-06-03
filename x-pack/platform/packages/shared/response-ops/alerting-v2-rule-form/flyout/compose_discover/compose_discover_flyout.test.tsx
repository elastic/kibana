/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { ComposeDiscoverFlyout } from './compose_discover_flyout';
import type { ComposeDiscoverFlyoutProps } from './compose_discover_flyout';
import type { ComposeDiscoverForm } from './compose_discover_form';

type FormProps = React.ComponentProps<typeof ComposeDiscoverForm>;

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-test-subj="codeEditorMock" />,
}));

jest.mock('@kbn/esql-editor', () => ({
  ESQLEditor: () => <div data-test-subj="esqlEditorMock" />,
}));

const mockComposeDiscoverForm = jest.fn((_props: FormProps) => (
  <div data-test-subj="composeDiscoverFormMock" />
));

jest.mock('./compose_discover_form', () => {
  const actual = jest.requireActual('./use_compose_discover_state');
  return {
    getSteps: (isAlert: boolean) => ({
      steps: actual.getStepIds(isAlert).map((id: string) => {
        const titles: Record<string, string> = {
          alertCondition: 'Alert Condition',
          recoveryCondition: 'Recovery Condition',
          details: 'Details & Artifacts',
        };
        return { id, title: titles[id], render: () => <div /> };
      }),
    }),
    ComposeDiscoverForm: (props: FormProps) => mockComposeDiscoverForm(props),
  };
});

jest.mock('./query_sandbox_flyout', () => ({
  QuerySandboxFlyout: () => <div data-test-subj="composeDiscoverChildMock" />,
}));

jest.mock('./use_esql_providers', () => ({
  useEsqlAutocomplete: jest.fn(),
}));

jest.mock('./use_split_query_completion', () => ({
  useSplitQueryCompletion: () => ({ onEditorMount: jest.fn() }),
}));

jest.mock('../../form/utils/yaml_form_utils', () => ({
  serializeFormToYaml: () => '',
  parseYamlToFormValues: () => ({ values: null }),
}));

jest.mock('../../form/yaml_rule_form', () => ({
  YamlRuleForm: () => <div data-test-subj="yamlRuleFormMock" />,
}));

const createMockServices = (): RuleFormServices => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
  lens: lensPluginMock.createStartContract(),
  workflowForm: { Component: () => null, defaultValue: () => ({}) },
  uiActions: uiActionsPluginMock.createStartContract(),
});

const defaultProps: ComposeDiscoverFlyoutProps = {
  historyKey: Symbol('test'),
  mode: 'create',
  onClose: jest.fn(),
  services: createMockServices(),
  onCreateRule: jest.fn(),
};

const renderFlyout = (overrides: Partial<ComposeDiscoverFlyoutProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <ComposeDiscoverFlyout {...defaultProps} {...overrides} />
    </IntlProvider>
  );

describe('ComposeDiscoverFlyout', () => {
  describe('HorizontalMinimalStepper', () => {
    it('renders the stepper with the correct aria-label for step 1 of 2', () => {
      renderFlyout();

      const stepper = screen.getByRole('group', { name: /Step 1 of 2: Alert Condition/ });
      expect(stepper).toBeInTheDocument();
    });

    it('renders 2 steps when tracking is disabled (default)', () => {
      renderFlyout();

      expect(screen.getByText('1 / 2')).toBeInTheDocument();
      expect(screen.getByText('Alert Condition')).toBeInTheDocument();
    });

    it('does not render the stepper in YAML mode', () => {
      renderFlyout();

      const toggleGroup = screen.getByTestId('composeDiscoverEditModeToggle');
      const yamlButton =
        toggleGroup.querySelector('button[data-test-subj="yaml"]') ??
        toggleGroup.querySelectorAll('button')[1];
      fireEvent.click(yamlButton!);

      expect(screen.queryByRole('group', { name: /Step \d+ of \d+/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverYamlBadge')).toBeInTheDocument();
    });
  });

  describe('flyout title', () => {
    it('shows "Create alert rule" in create mode', () => {
      renderFlyout({ mode: 'create' });
      expect(screen.getByText('Create alert rule')).toBeInTheDocument();
    });

    it('shows "Edit alert rule" in edit mode', () => {
      renderFlyout({ mode: 'edit' });
      expect(screen.getByText('Edit alert rule')).toBeInTheDocument();
    });
  });

  describe('isEditing prop', () => {
    beforeEach(() => {
      mockComposeDiscoverForm.mockClear();
    });

    it('passes isEditing=false in create mode', () => {
      renderFlyout({ mode: 'create' });
      expect(mockComposeDiscoverForm).toHaveBeenCalledWith(
        expect.objectContaining({ isEditing: false })
      );
    });

    it('passes isEditing=true in edit mode', () => {
      renderFlyout({ mode: 'edit' });
      expect(mockComposeDiscoverForm).toHaveBeenCalledWith(
        expect.objectContaining({ isEditing: true })
      );
    });

    it('passes isEditing=false in clone mode', () => {
      renderFlyout({ mode: 'clone' });
      expect(mockComposeDiscoverForm).toHaveBeenCalledWith(
        expect.objectContaining({ isEditing: false })
      );
    });
  });

  describe('footer navigation', () => {
    it('shows Next button on non-final step', () => {
      renderFlyout();
      expect(screen.getByTestId('composeDiscoverNext')).toBeInTheDocument();
      expect(screen.queryByTestId('composeDiscoverSubmit')).not.toBeInTheDocument();
    });

    it('does not show Back button on the first step', () => {
      renderFlyout();
      expect(screen.queryByTestId('composeDiscoverBack')).not.toBeInTheDocument();
    });

    it('disables Next when query is not committed on alertCondition step', () => {
      renderFlyout();
      expect(screen.getByTestId('composeDiscoverNext')).toBeDisabled();
    });
  });
});
