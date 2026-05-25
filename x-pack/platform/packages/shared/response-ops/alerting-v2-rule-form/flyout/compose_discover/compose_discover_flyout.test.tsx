/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';
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

const FormKindCapture = () => {
  const { watch } = useFormContext();
  return <span data-test-subj="capturedKind">{watch('kind')}</span>;
};

const mockComposeDiscoverForm = jest.fn((_props: FormProps) => (
  <div data-test-subj="composeDiscoverFormMock">
    <FormKindCapture />
  </div>
));

jest.mock('./compose_discover_form', () => {
  const actual = jest.requireActual('./use_compose_discover_state');
  return {
    getSteps: (isAlert: boolean) =>
      actual.getStepIds(isAlert).map((id: string) => {
        const titles: Record<string, string> = {
          alertCondition: 'Alert Condition',
          recoveryCondition: 'Recovery Condition',
          details: 'Details & Artifacts',
          notifications: 'Notifications',
        };
        return { id, title: titles[id], render: () => <div /> };
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

const mockParseYamlToFormValues = jest.fn<{ values: FormValues | null }, [string]>(() => ({
  values: null,
}));

jest.mock('../../form/utils/yaml_form_utils', () => ({
  serializeFormToYaml: () => '',
  parseYamlToFormValues: (...args: [string]) => mockParseYamlToFormValues(...args),
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
    it('renders the stepper with the correct aria-label for step 1 of 3', () => {
      renderFlyout();

      const stepper = screen.getByRole('group', { name: /Step 1 of 3: Alert Condition/ });
      expect(stepper).toBeInTheDocument();
    });

    it('renders 3 steps when tracking is disabled (default)', () => {
      renderFlyout();

      expect(screen.getByText('1 / 3')).toBeInTheDocument();
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

  describe('YAML kind pinning', () => {
    const EDIT_ALERT_RULE = {
      id: 'rule-123',
      kind: 'alert' as const,
      enabled: true,
      metadata: { name: 'Test alert rule', description: '', tags: [] },
      time_field: '@timestamp',
      schedule: { every: '1m', lookback: '5m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name\n| WHERE count > 100',
        },
      },
      state_transition: null,
      createdBy: 'test',
      createdAt: '2024-01-01T00:00:00Z',
      updatedBy: 'test',
      updatedAt: '2024-01-01T00:00:00Z',
    } as ComposeDiscoverFlyoutProps['rule'];

    const YAML_PARSED_SIGNAL_VALUES: FormValues = {
      kind: 'signal',
      metadata: { name: 'Test alert rule', enabled: true, description: '' },
      timeField: '@timestamp',
      schedule: { every: '1m', lookback: '5m' },
      evaluation: { query: { base: 'FROM logs-* | WHERE count > 100' } },
      stateTransitionAlertDelayMode: 'immediate',
      stateTransitionRecoveryDelayMode: 'immediate',
    };

    const clickYamlToggle = () => {
      const toggleGroup = screen.getByTestId('composeDiscoverEditModeToggle');
      const yamlButton =
        toggleGroup.querySelector('button[data-test-subj="yaml"]') ??
        toggleGroup.querySelectorAll('button')[1];
      fireEvent.click(yamlButton!);
    };

    const clickFormToggle = () => {
      const toggleGroup = screen.getByTestId('composeDiscoverEditModeToggle');
      const formButton =
        toggleGroup.querySelector('button[data-test-subj="form"]') ??
        toggleGroup.querySelectorAll('button')[0];
      fireEvent.click(formButton!);
    };

    beforeEach(() => {
      mockParseYamlToFormValues.mockReset().mockReturnValue({ values: null });
    });

    it('pins kind to initialKind when toggling from YAML back to form mode', () => {
      renderFlyout({
        mode: 'edit',
        rule: EDIT_ALERT_RULE,
        ruleId: 'rule-123',
        onUpdateRule: jest.fn(),
      });

      expect(screen.getByTestId('capturedKind').textContent).toBe('alert');

      clickYamlToggle();

      mockParseYamlToFormValues.mockReturnValue({ values: YAML_PARSED_SIGNAL_VALUES });

      clickFormToggle();

      expect(screen.getByTestId('capturedKind').textContent).toBe('alert');
    });

    it('does not pin kind in create mode (YAML toggle)', () => {
      renderFlyout({ mode: 'create' });

      clickYamlToggle();

      mockParseYamlToFormValues.mockReturnValue({ values: YAML_PARSED_SIGNAL_VALUES });

      clickFormToggle();

      expect(screen.getByTestId('capturedKind').textContent).toBe('signal');
    });

    it('pins kind to initialKind on YAML save in edit mode', async () => {
      const onUpdateRule = jest.fn();
      renderFlyout({
        mode: 'edit',
        rule: EDIT_ALERT_RULE,
        ruleId: 'rule-123',
        onUpdateRule,
      });

      clickYamlToggle();

      mockParseYamlToFormValues.mockReturnValue({ values: YAML_PARSED_SIGNAL_VALUES });

      fireEvent.click(screen.getByTestId('composeDiscoverYamlSubmit'));

      await waitFor(() => {
        expect(onUpdateRule).toHaveBeenCalledWith(
          'rule-123',
          expect.not.objectContaining({ kind: 'signal' })
        );
      });
    });
  });
});
