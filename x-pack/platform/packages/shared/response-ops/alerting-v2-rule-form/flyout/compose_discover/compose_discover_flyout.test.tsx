/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { FormValues, RuleQuery } from '../../form/types';
import { createTestQueryClient } from '../../test_utils';
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

jest.mock('./compose_discover_form/alert_condition_step', () => ({
  AlertConditionStep: () => null,
}));

jest.mock('./compose_discover_form/recovery_condition_step', () => ({
  RecoveryConditionStep: () => null,
}));

jest.mock('./compose_discover_form/details_and_artifacts_step', () => ({
  DetailsAndArtifactsStep: () => null,
}));

jest.mock('./compose_discover_form/notifications_step', () => ({
  NotificationsStep: () => null,
}));

jest.mock('./compose_discover_form/linked_action_policies_step', () => ({
  LinkedActionPoliciesStep: () => null,
}));

jest.mock('./compose_discover_form/centralized_action_policies_panel', () => ({
  CentralizedActionPoliciesPanel: () => null,
}));

jest.mock('./compose_discover_form/esql_recovery_content', () => ({
  EsqlRecoveryContent: () => null,
}));

const mockComposeDiscoverForm = jest.fn((_props: FormProps) => (
  <div data-test-subj="composeDiscoverFormMock" />
));

jest.mock('./compose_discover_form', () => {
  const { useFormContext } = jest.requireActual(
    'react-hook-form'
  ) as typeof import('react-hook-form');
  const { getSteps } = jest.requireActual(
    './compose_discover_form'
  ) as typeof import('./compose_discover_form');
  const { QueryFieldRules } = jest.requireActual(
    './compose_discover_form/query_field_rules'
  ) as typeof import('./compose_discover_form/query_field_rules');
  return {
    getSteps,
    ComposeDiscoverForm: (props: FormProps) => {
      mockComposeDiscoverForm(props);
      const { setValue, getValues } = useFormContext<FormValues>();
      readCommittedQuery = () => getValues('query');
      readRecoveryStrategy = () => getValues('recoveryStrategy');
      readNoDataStrategy = () => getValues('noDataStrategy');
      readTimeField = () => getValues('timeField');
      readKind = () => getValues('kind');
      return (
        <div data-test-subj="composeDiscoverFormMock">
          {/* Keep query rules mounted so validateStep → trigger(['query']) can fail. */}
          <QueryFieldRules queryCommitted={props.state.queryCommitted} />
          <button
            data-test-subj="mockMakeDirty"
            onClick={() => setValue('metadata.name', 'changed', { shouldDirty: true })}
            type="button"
          >
            Make dirty
          </button>
          <button
            data-test-subj="mockSetFormTimeField"
            onClick={() => setValue('timeField', 'event.ingested', { shouldDirty: true })}
            type="button"
          >
            Set form time field
          </button>
        </div>
      );
    },
  };
});

interface SandboxFlyoutMockProps {
  query: RuleQuery;
  onQueryChange?: (query: RuleQuery) => void;
  tabs?: Array<'base' | 'alert' | 'recovery'>;
  timeField?: string;
  onTimeFieldChange?: (timeField: string) => void;
  timeFieldOptions?: Array<{ value: string; text: string }>;
  onApply?: () => void;
  onClose: () => void;
  helpText?: React.ReactNode;
  headerActions?: React.ReactNode;
}

let sandboxFlyoutProps: SandboxFlyoutMockProps | undefined;
let readCommittedQuery: (() => RuleQuery) | undefined;
let readRecoveryStrategy: (() => FormValues['recoveryStrategy']) | undefined;
let readNoDataStrategy: (() => FormValues['noDataStrategy']) | undefined;
let readTimeField: (() => FormValues['timeField']) | undefined;
let readKind: (() => FormValues['kind']) | undefined;

jest.mock('./query_sandbox_flyout', () => ({
  QuerySandboxFlyout: (props: SandboxFlyoutMockProps) => {
    sandboxFlyoutProps = props;
    return (
      <div data-test-subj="composeDiscoverChildMock">
        <div data-test-subj="mockSandboxHelpText">{props.helpText}</div>
        <div data-test-subj="mockSandboxHeaderActions">{props.headerActions}</div>
        {props.onTimeFieldChange ? (
          // eslint-disable-next-line jsx-a11y/no-onchange
          <select
            data-test-subj="querySandboxTimeField"
            value={props.timeField}
            onChange={(e) => props.onTimeFieldChange?.(e.target.value)}
          >
            {props.timeFieldOptions?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        ) : null}
        {props.onApply ? (
          <button type="button" data-test-subj="mockSandboxApply" onClick={() => props.onApply?.()}>
            Apply
          </button>
        ) : null}
        <button
          type="button"
          data-test-subj="composeDiscoverChildMockClose"
          onClick={props.onClose}
        >
          Close sandbox
        </button>
      </div>
    );
  },
}));

jest.mock('./use_esql_providers', () => ({
  useEsqlAutocomplete: jest.fn(),
}));

jest.mock('./use_split_query_completion', () => ({
  useSplitQueryCompletion: () => ({ onEditorMount: jest.fn() }),
}));

jest.mock('./use_resolve_time_field', () => ({
  useResolveTimeField: () => ({
    timeFieldOptions: [
      { value: '@timestamp', text: '@timestamp' },
      { value: 'event.ingested', text: 'event.ingested' },
    ],
    isTimeFieldResolved: true,
  }),
}));

jest.mock('../../form/hooks/use_data_fields', () => ({
  useDataFields: () => ({ data: {}, isLoading: false }),
}));

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLTimeField: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../form/utils/yaml_form_utils', () => ({
  serializeFormToYaml: () => 'mock-yaml',
  parseYamlToFormValues: jest.fn((yaml: string) => mockParseYamlToFormValues(yaml)),
}));

const defaultYamlFormValues: FormValues = {
  kind: 'signal',
  metadata: { name: 'changed', enabled: true, description: '', tags: [] },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: '' } },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
};

let mockParseYamlToFormValues: (yaml: string) => {
  values: FormValues | null;
  error: string | null;
} = (yaml) => ({
  values: yaml ? defaultYamlFormValues : null,
  error: null,
});

jest.mock('../../form/yaml_rule_form', () => ({
  YamlRuleForm: ({ setYamlText }: { setYamlText: (yaml: string) => void }) => (
    <div data-test-subj="yamlRuleFormMock">
      <button
        data-test-subj="mockMakeYamlDirty"
        onClick={() => setYamlText('name: changed\n')}
        type="button"
      >
        Make YAML dirty
      </button>
    </div>
  ),
}));

const createMockServices = (): RuleFormServices => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
  lens: lensPluginMock.createStartContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
});

const testQueryClient = createTestQueryClient();

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const defaultProps: ComposeDiscoverFlyoutProps = {
  historyKey: Symbol('test'),
  mode: 'create',
  onClose: jest.fn(),
  services: createMockServices(),
  onCreateRule: jest.fn(),
};

const renderFlyout = (overrides: Partial<ComposeDiscoverFlyoutProps> = {}) =>
  render(
    <TestWrapper>
      <ComposeDiscoverFlyout {...defaultProps} {...overrides} />
    </TestWrapper>
  );

const getLatestFormProps = (): FormProps =>
  mockComposeDiscoverForm.mock.calls[mockComposeDiscoverForm.mock.calls.length - 1][0];

const clickComposeDiscoverNext = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('composeDiscoverNext'));
  });
};

const commitValidAlertQuery = () => {
  if (!screen.queryByTestId('composeDiscoverChildMock')) {
    openSandbox();
  }
  act(() => {
    sandboxFlyoutProps?.onQueryChange?.({
      format: 'standalone',
      breach: { query: 'FROM logs-* | WHERE count > 100' },
    });
  });
  act(() => {
    fireEvent.click(screen.getByTestId('mockSandboxApply'));
  });
};

const getEditModeButton = (mode: 'form' | 'yaml') => {
  const buttons = screen.getByTestId('composeDiscoverEditModeToggle').querySelectorAll('button');
  return mode === 'form' ? buttons[0] : buttons[1];
};

const clickEditMode = (mode: 'form' | 'yaml') => {
  fireEvent.click(getEditModeButton(mode)!);
};

const openSandbox = (step = 0) => {
  act(() => {
    getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step, isAlert: true });
  });
};

const openSandboxSettings = () => {
  fireEvent.click(screen.getByTestId('querySandboxSettingsButton'));
};

const clickSplitBaseAndAlert = () => {
  openSandboxSettings();
  fireEvent.click(screen.getByTestId('querySandboxSplitBaseAndAlert'));
};

describe('ComposeDiscoverFlyout', () => {
  beforeEach(() => {
    sandboxFlyoutProps = undefined;
    readCommittedQuery = undefined;
    readRecoveryStrategy = undefined;
    readNoDataStrategy = undefined;
    readTimeField = undefined;
    readKind = undefined;
    mockParseYamlToFormValues = (yaml) => ({
      values: yaml ? defaultYamlFormValues : null,
      error: null,
    });
  });
  describe('HorizontalMinimalStepper', () => {
    it('renders the stepper with the correct aria-label for step 1 of 4', () => {
      renderFlyout();

      const stepper = screen.getByRole('group', { name: /Step 1 of 4: Alert Condition/ });
      expect(stepper).toBeInTheDocument();
    });

    it('renders 4 steps when tracking is enabled (default)', () => {
      renderFlyout();

      expect(screen.getByText('1 / 4')).toBeInTheDocument();
      expect(screen.getByText('Alert Condition')).toBeInTheDocument();
    });

    it('does not render the stepper in YAML mode', () => {
      renderFlyout();

      clickEditMode('yaml');

      expect(screen.queryByRole('group', { name: /Step \d+ of \d+/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverYamlBadge')).toBeInTheDocument();
    });

    it('renders Query sandbox button in YAML mode only', () => {
      renderFlyout();

      expect(screen.queryByTestId('composeDiscoverYamlQuerySandbox')).not.toBeInTheDocument();

      clickEditMode('yaml');

      expect(screen.getByTestId('composeDiscoverYamlQuerySandbox')).toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverYamlQuerySandbox')).toHaveTextContent(
        'Query sandbox'
      );

      clickEditMode('form');

      expect(screen.queryByTestId('composeDiscoverYamlQuerySandbox')).not.toBeInTheDocument();
    });

    it('disables Form/YAML toggle while sandbox is open in form mode', () => {
      renderFlyout();

      // Open the sandbox in form mode — toggle must become disabled
      openSandbox();

      const buttons = screen
        .getByTestId('composeDiscoverEditModeToggle')
        .querySelectorAll('button');
      buttons.forEach((btn) => expect(btn).toBeDisabled());

      // Close sandbox — toggle re-enables
      fireEvent.click(screen.getByTestId('composeDiscoverChildMockClose'));

      const buttonsAfter = screen
        .getByTestId('composeDiscoverEditModeToggle')
        .querySelectorAll('button');
      buttonsAfter.forEach((btn) => expect(btn).not.toBeDisabled());
    });

    it('keeps Form/YAML toggle enabled while sandbox is open in YAML mode', () => {
      renderFlyout();

      // Switch to YAML (SET_YAML_MODE opens the sandbox)
      clickEditMode('yaml');

      // Sandbox is now open in YAML mode — toggle must stay enabled
      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();
      const buttons = screen
        .getByTestId('composeDiscoverEditModeToggle')
        .querySelectorAll('button');
      buttons.forEach((btn) => expect(btn).not.toBeDisabled());
    });

    it('reopens Query sandbox after manual close in YAML mode', () => {
      renderFlyout();

      clickEditMode('yaml');

      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('composeDiscoverChildMockClose'));

      expect(screen.queryByTestId('composeDiscoverChildMock')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('composeDiscoverYamlQuerySandbox'));

      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();
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

    it('advances to recovery step when validateStep passes', async () => {
      renderFlyout({ mode: 'create' });
      commitValidAlertQuery();

      await clickComposeDiscoverNext();

      expect(getLatestFormProps().state.step).toBe(1);
    });

    it('stays on alert condition step when the committed query is invalid', () => {
      renderFlyout({
        mode: 'edit',
        ruleId: 'rule-1',
        rule: {
          id: 'rule-1',
          kind: 'signal',
          enabled: true,
          metadata: { name: 'Signal rule', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: { format: 'standalone', breach: { query: '' } },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      expect(screen.getByTestId('composeDiscoverNext')).toBeDisabled();
      expect(getLatestFormProps().state.step).toBe(0);
    });
  });

  describe('unsaved-changes confirmation', () => {
    it('closes immediately when the form is pristine and the X button is clicked', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('alertingV2ConfirmRuleCloseModal')).not.toBeInTheDocument();
    });

    it('does not render a Cancel button in the footer', () => {
      renderFlyout({});

      expect(screen.queryByTestId('composeDiscoverCancel')).not.toBeInTheDocument();
    });

    it('shows the confirmation modal when the form is dirty and the X button is clicked', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('mockMakeDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertingV2ConfirmRuleCloseModal')).toBeInTheDocument();
    });

    it('"Continue editing" dismisses the modal and keeps the flyout open', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('mockMakeDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.queryByTestId('alertingV2ConfirmRuleCloseModal')).not.toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverFormMock')).toBeInTheDocument();
    });

    it('"Discard changes" calls onClose', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('mockMakeDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows confirmation in YAML mode when text differs from baseline', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      clickEditMode('yaml');

      fireEvent.click(screen.getByTestId('mockMakeYamlDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertingV2ConfirmRuleCloseModal')).toBeInTheDocument();
    });

    it('closes immediately in YAML mode when text matches baseline', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      clickEditMode('yaml');

      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('alertingV2ConfirmRuleCloseModal')).not.toBeInTheDocument();
    });

    it('"Continue editing" does not open sandbox when it was closed before close attempt', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose, mode: 'edit' });

      expect(screen.queryByTestId('composeDiscoverChildMock')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('mockMakeDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      expect(screen.queryByTestId('composeDiscoverChildMock')).not.toBeInTheDocument();
    });

    it('"Continue editing" reopens sandbox in YAML mode', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      clickEditMode('yaml');

      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('mockMakeYamlDirty'));
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();
    });

    it('shows confirmation after editing in YAML mode and switching back to form mode', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      clickEditMode('yaml');
      fireEvent.click(screen.getByTestId('mockMakeYamlDirty'));
      clickEditMode('form');

      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertingV2ConfirmRuleCloseModal')).toBeInTheDocument();
    });
  });

  describe('initialQuery from Discover', () => {
    const timeLiteralVariable: ESQLControlVariable[] = [
      { key: 'window', value: '15m', type: ESQLVariableType.TIME_LITERAL },
    ];

    it('shows unresolved variables in a callout and disables YAML Create rule', () => {
      renderFlyout({
        initialQuery: 'FROM logs-* | WHERE @timestamp > NOW() - ?window | LIMIT 5',
        esqlVariables: timeLiteralVariable,
      });

      const callout = screen.getByTestId('ruleV2FlyoutValidationErrors');
      expect(callout).toHaveTextContent('?window');
      expect(screen.getByTestId('composeDiscoverNext')).toBeDisabled();

      clickEditMode('yaml');

      expect(screen.getByTestId('composeDiscoverYamlSubmit')).toBeDisabled();
    });

    it('does not show a validation callout when all variables are inlined', () => {
      const esqlVariables: ESQLControlVariable[] = [
        { key: 'host', value: 'web-1', type: ESQLVariableType.VALUES },
      ];
      renderFlyout({
        initialQuery: 'FROM logs-* | WHERE host == ?host | LIMIT 5',
        esqlVariables,
      });

      expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    });

    it('updates validation when initialQuery changes before the form is edited', () => {
      const props = {
        ...defaultProps,
        initialQuery: 'FROM logs-* | LIMIT 5',
        esqlVariables: [] as ESQLControlVariable[],
      };
      const { rerender } = render(
        <TestWrapper>
          <ComposeDiscoverFlyout {...props} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();

      rerender(
        <TestWrapper>
          <ComposeDiscoverFlyout
            {...props}
            initialQuery="FROM logs-* | WHERE host == ?host | LIMIT 5"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('ruleV2FlyoutValidationErrors')).toHaveTextContent('?host');
    });

    it('does not update the query after the user edits the form', () => {
      const props = {
        ...defaultProps,
        initialQuery: 'FROM logs-* | LIMIT 5',
        esqlVariables: [] as ESQLControlVariable[],
      };
      const { rerender } = render(
        <TestWrapper>
          <ComposeDiscoverFlyout {...props} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('mockMakeDirty'));

      rerender(
        <TestWrapper>
          <ComposeDiscoverFlyout {...props} initialQuery="FROM metrics-* | LIMIT 5" />
        </TestWrapper>
      );

      expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    });
  });

  describe('initialQuery in builder mode', () => {
    it('seeds the form query when the Discover query is a parseable loose query', () => {
      renderFlyout({
        builderType: 'threshold',
        initialQuery: 'FROM logs-* | WHERE status >= 500',
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query');
      }
      expect(committed.base).toContain('FROM logs-*');
      expect(committed.breach.segment).toContain('WHERE');
    });

    it('seeds the form query when the Discover query is a full threshold query', () => {
      renderFlyout({
        builderType: 'threshold',
        initialQuery: 'FROM logs-* | STATS count = COUNT(*) | WHERE count > 100',
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query');
      }
      expect(committed.base).toContain('FROM logs-*');
      expect(committed.breach.segment).toContain('WHERE');
    });

    it('keeps the form query empty when the Discover query is unparseable', () => {
      renderFlyout({
        builderType: 'threshold',
        initialQuery: 'ROW x = 1',
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query');
      }
      expect(committed.base).toBe('');
      expect(committed.breach.segment).toBe('');
    });

    it('keeps the form query empty when the Discover query has syntax errors', () => {
      renderFlyout({
        builderType: 'threshold',
        initialQuery: 'FROM logs-* | WERE status >= 500',
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query');
      }
      expect(committed.base).toBe('');
      expect(committed.breach.segment).toBe('');
    });

    it('still seeds the form query for ES|QL mode (no builderType) with any valid query', () => {
      renderFlyout({
        initialQuery: 'FROM logs-* | WHERE status >= 500',
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query');
      }
      expect(committed.base).toContain('FROM logs-*');
      expect(committed.breach.segment).toContain('WHERE');
    });
  });

  describe('YAML save submission', () => {
    const validComposedYamlValues: FormValues = {
      kind: 'alert',
      metadata: { name: 'Test rule', enabled: true, description: '', tags: [] },
      timeField: '@timestamp',
      schedule: { every: '1m', lookback: '5m' },
      query: {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
      },
      stateTransitionAlertDelayMode: 'immediate',
      stateTransitionRecoveryDelayMode: 'immediate',
      artifacts: [],
    };

    const standaloneAlertYamlValues: FormValues = {
      ...validComposedYamlValues,
      query: {
        format: 'standalone',
        breach: { query: 'FROM logs-*' },
      },
    };

    it('allows YAML save for alert + standalone', async () => {
      const onCreateRule = jest.fn();
      mockParseYamlToFormValues = () => ({
        values: validComposedYamlValues,
        error: null,
      });
      renderFlyout({
        onCreateRule,
        initialQuery: 'FROM logs-* | WHERE count > 100',
      });

      clickEditMode('yaml');
      mockParseYamlToFormValues = () => ({
        values: standaloneAlertYamlValues,
        error: null,
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('composeDiscoverYamlSubmit'));
      });

      await waitFor(() => {
        expect(onCreateRule).toHaveBeenCalledTimes(1);
      });
    });

    it('allows YAML save for a valid composed alert', async () => {
      const onCreateRule = jest.fn();
      mockParseYamlToFormValues = () => ({
        values: validComposedYamlValues,
        error: null,
      });
      renderFlyout({
        onCreateRule,
        initialQuery: 'FROM logs-* | WHERE count > 100',
      });

      clickEditMode('yaml');

      await act(async () => {
        fireEvent.click(screen.getByTestId('composeDiscoverYamlSubmit'));
      });

      await waitFor(() => {
        expect(onCreateRule).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('handleSandboxApply', () => {
    it('runs heuristic split and commits the result in create + alert unified editor', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      expect(sandboxFlyoutProps).toBeDefined();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query after Apply');
      }
      expect(committed.base).toContain('FROM logs-*');
      expect(committed.breach.segment).toContain('WHERE count > 100');
      expect(screen.getByTestId('composeDiscoverNext')).not.toBeDisabled();
    });

    it('runs heuristic split and commits the result in edit + alert unified editor', () => {
      renderFlyout({
        mode: 'edit',
        rule: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Edit rule', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: { segment: '| WHERE count > 100' },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      act(() => {
        mockComposeDiscoverForm.mock.calls[
          mockComposeDiscoverForm.mock.calls.length - 1
        ][0].dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });

      expect(sandboxFlyoutProps).toBeDefined();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM logs-* | WHERE count > 200',
          breach: { segment: '' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('composed');
      if (committed?.format !== 'composed') {
        throw new Error('expected composed query after Apply');
      }
      expect(committed.base).toContain('FROM logs-*');
      expect(committed.breach.segment).toContain('WHERE count > 200');
    });

    it('does not re-split in edit mode YAML and commits the sandbox structure as-is', () => {
      const editFormValues: FormValues = {
        kind: 'alert',
        metadata: { name: 'Edit rule', enabled: true, description: '', tags: [] },
        timeField: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: '| WHERE count > 100' },
        },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
        artifacts: [],
      };

      mockParseYamlToFormValues = () => ({
        values: editFormValues,
        error: null,
      });

      renderFlyout({
        mode: 'edit',
        rule: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Edit rule', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: { segment: '| WHERE count > 100' },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      clickEditMode('yaml');
      expect(sandboxFlyoutProps).toBeDefined();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: '| WHERE count > 50' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      const committed = readCommittedQuery?.();
      expect(committed).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: '| WHERE count > 50' },
      });
    });

    it('commits manual split base/alert verbatim without running the heuristic', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      expect(sandboxFlyoutProps).toBeDefined();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();

      expect(sandboxFlyoutProps?.query).toMatchObject({
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
      });

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM custom-base',
        breach: { segment: '| WHERE custom > 1' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readCommittedQuery?.()).toEqual(manualSplitQuery);
    });

    it('promotes signal to alert and keeps manual split after Apply', () => {
      renderFlyout({ mode: 'create' });
      act(() => {
        getLatestFormProps().onKindChange('signal');
      });
      expect(readKind?.()).toBe('signal');

      openSandbox();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM custom-base',
        breach: { segment: '| WHERE custom > 1' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readKind?.()).toBe('alert');
      expect(readCommittedQuery?.()).toEqual(manualSplitQuery);
      expect(readRecoveryStrategy?.()).toBe('no_breach');
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });
      expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);
      expect(sandboxFlyoutProps?.query).toEqual(manualSplitQuery);
    });

    it('collapses composed to standalone on signal unified Apply (no manual split)', () => {
      renderFlyout({ mode: 'create' });
      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      openSandbox();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readKind?.()).toBe('signal');
      // Unified Apply may produce composed via heuristic, then signal collapses it.
      const committed = readCommittedQuery?.();
      expect(committed?.format).toBe('standalone');
      if (committed?.format !== 'standalone') {
        throw new Error('expected standalone after signal unified Apply');
      }
      expect(committed.breach.query).toContain('FROM logs-*');
      expect(committed.breach.query).toContain('WHERE count > 100');
    });

    it('falls back to conditionless standalone when manual split is applied with an empty alert condition', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        });
      });
      clickSplitBaseAndAlert();

      // Simulate user leaving alert condition tab empty
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          breach: { segment: '' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readCommittedQuery?.()).toEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
      });
      expect(readNoDataStrategy?.()).toBe('none');
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);
    });

    it('keeps signal kind when manual split Apply falls back to conditionless standalone', () => {
      renderFlyout({ mode: 'create' });
      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      openSandbox();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        });
      });
      clickSplitBaseAndAlert();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          breach: { segment: '' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readKind?.()).toBe('signal');
      expect(readCommittedQuery?.()).toEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
      });
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);
    });

    it('preserves custom recovery when applying manual split edits', () => {
      const queryWithRecovery: RuleQuery = {
        format: 'composed',
        base: 'FROM logs-* | WHERE count > 100',
        breach: { segment: '' },
        recovery: { segment: '| WHERE count < 50' },
      };

      renderFlyout({
        mode: 'edit',
        rule: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Edit rule', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: { segment: '| WHERE count > 100' },
            recovery: { segment: '| WHERE count < 50' },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      act(() => {
        mockComposeDiscoverForm.mock.calls[
          mockComposeDiscoverForm.mock.calls.length - 1
        ][0].dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });

      expect(sandboxFlyoutProps).toBeDefined();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(queryWithRecovery);
      });
      clickSplitBaseAndAlert();

      expect(sandboxFlyoutProps?.query).toMatchObject({
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
        recovery: { segment: '| WHERE count < 50' },
      });

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: '| WHERE count > 200' },
          recovery: { segment: '| WHERE count < 50' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readCommittedQuery?.()).toEqual({
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 200' },
        recovery: { segment: '| WHERE count < 50' },
      });
    });

    it('commits subsequent recovery edits when manualSplitEnabled is stale from alert condition', async () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: '| WHERE count > 100' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      await clickComposeDiscoverNext();

      act(() => {
        getLatestFormProps().onRecoveryTypeChange('custom');
      });

      const firstRecoveryEdit: RuleQuery = {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
        recovery: { segment: '| WHERE count < 50' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(firstRecoveryEdit);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });
      expect(readCommittedQuery?.()).toEqual(firstRecoveryEdit);

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 1, isAlert: true });
      });

      const secondRecoveryEdit: RuleQuery = {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
        recovery: { segment: '| WHERE count < 10' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(secondRecoveryEdit);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readCommittedQuery?.()).toEqual(secondRecoveryEdit);
    });
  });

  describe('sandbox time field selection', () => {
    it('keeps a manually selected sandbox time field instead of reverting to the form value (#281806)', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      const select = screen.getByTestId('querySandboxTimeField') as HTMLSelectElement;
      expect(select.value).toBe('@timestamp');

      act(() => {
        fireEvent.change(select, { target: { value: 'event.ingested' } });
      });

      expect(select.value).toBe('event.ingested');

      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readTimeField?.()).toBe('event.ingested');
    });

    it('syncs a form-step time field change into the draft while the sandbox is closed', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();
      fireEvent.click(screen.getByTestId('composeDiscoverChildMockClose'));

      act(() => {
        fireEvent.click(screen.getByTestId('mockSetFormTimeField'));
      });
      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });

      expect(sandboxFlyoutProps?.timeField).toBe('event.ingested');
    });
  });

  describe('manual split mode', () => {
    it('shows the split button before any query is typed', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      // The gear menu is the entry point; the split action lives inside it.
      expect(screen.getByTestId('querySandboxSettingsButton')).toBeInTheDocument();
      openSandboxSettings();
      expect(screen.getByTestId('querySandboxSplitBaseAndAlert')).toBeInTheDocument();
    });

    it('shows split controls in edit mode when the sandbox is open', () => {
      renderFlyout({
        mode: 'edit',
        rule: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Edit rule', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: { segment: '| WHERE count > 100' },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });

      expect(screen.getByTestId('querySandboxSettingsButton')).toBeInTheDocument();
      expect(screen.getByTestId('querySandboxUnifiedHelper')).toBeInTheDocument();
      openSandboxSettings();
      expect(screen.getByTestId('querySandboxSplitBaseAndAlert')).toBeInTheDocument();
    });

    it('hides split controls when editing a signal rule', () => {
      renderFlyout({
        mode: 'edit',
        rule: {
          id: 'rule-1',
          kind: 'signal',
          enabled: true,
          metadata: { name: 'Edit signal', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'standalone',
            breach: {
              query:
                'FROM kibana_sample_data_flights | WHERE Cancelled | STATS c = COUNT(*) BY Carrier | WHERE c > 3',
            },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: false });
      });

      expect(screen.queryByTestId('querySandboxSettingsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxUnifiedHelper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxSplitBaseAndAlert')).not.toBeInTheDocument();
    });

    it('shows split controls when cloning a signal rule and renders tabs after enabling', () => {
      renderFlyout({
        mode: 'clone',
        rule: {
          id: 'rule-1',
          kind: 'signal',
          enabled: true,
          metadata: { name: 'Clone signal', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'standalone',
            breach: {
              query:
                'FROM kibana_sample_data_flights | WHERE Cancelled | STATS c = COUNT(*) BY Carrier | WHERE c > 3',
            },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      expect(getLatestFormProps().state.mode).toBe('clone');
      expect(getLatestFormProps().isEditing).toBe(false);
      expect(readKind?.()).toBe('signal');

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: false });
      });

      expect(screen.getByTestId('querySandboxSettingsButton')).toBeInTheDocument();
      expect(screen.getByTestId('querySandboxUnifiedHelper')).toBeInTheDocument();
      clickSplitBaseAndAlert();

      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);
      expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);
    });

    it('promotes clone signal to alert and keeps manual split after Apply', () => {
      renderFlyout({
        mode: 'clone',
        rule: {
          id: 'rule-1',
          kind: 'signal',
          enabled: true,
          metadata: { name: 'Clone signal', version: 1, owner: 'test', tags: [] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | WHERE count > 100' },
          },
          createdBy: 'test',
          createdAt: '2026-01-01T00:00:00Z',
          updatedBy: 'test',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      expect(readKind?.()).toBe('signal');

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: false });
      });
      clickSplitBaseAndAlert();
      expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM custom-base',
        breach: { segment: '| WHERE custom > 1' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readKind?.()).toBe('alert');
      expect(readCommittedQuery?.()).toEqual(manualSplitQuery);
      expect(readRecoveryStrategy?.()).toBe('no_breach');
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);

      act(() => {
        getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert: true });
      });
      expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);
    });

    /*
     * Applying a split with an empty alert condition commits conditionless standalone.
     * Manual split must end there: base/alert tabs read `base` from the composed shape,
     * so leaving them on would render a blank editor while the pipeline sits in
     * breach.query. Kind and mode are irrelevant — only the committed format matters.
     */
    it.each([
      ['create + alert', { mode: 'create' as const }, true],
      [
        'create + signal',
        {
          mode: 'create' as const,
          // Kind is set after mount — see test body.
        },
        false,
      ],
      [
        'clone + signal',
        {
          mode: 'clone' as const,
          rule: {
            id: 'rule-1',
            kind: 'signal' as const,
            enabled: true,
            metadata: { name: 'Clone signal', version: 1, owner: 'test', tags: [] },
            time_field: '@timestamp',
            schedule: { every: '1m', lookback: '5m' },
            query: {
              format: 'standalone' as const,
              breach: { query: 'FROM logs-* | WHERE count > 100' },
            },
            createdBy: 'test',
            createdAt: '2026-01-01T00:00:00Z',
            updatedBy: 'test',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        },
        false,
      ],
    ])(
      'leaves manual split and reopens the unified editor after a conditionless Apply (%s)',
      (_name, flyoutProps, isAlert) => {
        renderFlyout(flyoutProps);
        if (!isAlert && flyoutProps.mode === 'create') {
          act(() => {
            getLatestFormProps().onKindChange('signal');
          });
        }

        act(() => {
          getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert });
        });
        // Drop the alert clause, then split: the whole pipeline lands in base.
        act(() => {
          sandboxFlyoutProps?.onQueryChange?.({
            format: 'standalone',
            breach: { query: 'FROM logs-*' },
          });
        });
        clickSplitBaseAndAlert();
        expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);
        expect(sandboxFlyoutProps?.query).toEqual({
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: '' },
        });

        act(() => {
          fireEvent.click(screen.getByTestId('mockSandboxApply'));
        });

        const conditionless: RuleQuery = {
          format: 'standalone',
          breach: { query: 'FROM logs-*' },
        };
        expect(readCommittedQuery?.()).toEqual(conditionless);
        expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);

        act(() => {
          getLatestFormProps().dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: 0, isAlert });
        });

        expect(sandboxFlyoutProps?.tabs).toBeUndefined();
        expect(sandboxFlyoutProps?.query).toEqual(conditionless);
      }
    );

    it('clears manual split synchronously when onQueryChange writes standalone', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();
      expect(sandboxFlyoutProps?.tabs).toEqual(['base', 'alert']);

      // assignSandboxQuery clears the flag in the same turn as the standalone write.
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-*' },
        });
      });

      expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);
      expect(sandboxFlyoutProps?.tabs).toBeUndefined();
      expect(screen.getByTestId('querySandboxUnifiedHelper')).toBeInTheDocument();
    });

    it('resets manual split when the sandbox is closed without Apply', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);

      fireEvent.click(screen.getByTestId('composeDiscoverChildMockClose'));

      expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);
    });

    it('keeps manual split enabled after Apply in manual split mode', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);
    });

    it('resets manual split when switching to YAML mode', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);
      expect(screen.queryByTestId('composeDiscoverChildMock')).not.toBeInTheDocument();

      clickEditMode('yaml');
      clickEditMode('form');

      expect(getLatestFormProps().state.manualSplitEnabled).toBe(false);
    });

    it('shows split controls and unified helper on the alert condition step only', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });

      expect(screen.getByTestId('querySandboxSettingsButton')).toBeInTheDocument();
      expect(screen.getByTestId('querySandboxUnifiedHelper')).toBeInTheDocument();
      openSandboxSettings();
      expect(screen.getByTestId('querySandboxSplitBaseAndAlert')).toBeInTheDocument();
    });

    it('hides split controls and unified helper on the custom recovery step', async () => {
      renderFlyout({ mode: 'create' });
      openSandbox();

      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      await clickComposeDiscoverNext();

      act(() => {
        getLatestFormProps().onRecoveryTypeChange('custom');
      });

      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();
      // The gear menu (and therefore the split action) is not rendered on recovery.
      expect(screen.queryByTestId('querySandboxSettingsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxSplitBaseAndAlert')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxUseSingleEditor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxUnifiedHelper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('querySandboxManualSplitHelper')).not.toBeInTheDocument();
    });
  });

  describe('forced YAML mode for non-representable rules', () => {
    const nonRepresentableRule = {
      id: 'test-rule-id',
      kind: 'alert' as const,
      enabled: true,
      metadata: { name: 'Standalone alert', tags: [] },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      query: {
        format: 'standalone' as const,
        breach: { query: 'FROM logs-* | STATS c = COUNT(*) BY h | WHERE c > 100' },
        recovery: { query: 'FROM logs-* | WHERE c < 10' },
      },
      recovery_strategy: 'query' as const,
    };

    const representableRule = {
      id: 'test-rule-id',
      kind: 'alert' as const,
      enabled: true,
      metadata: { name: 'Composed alert', tags: [] },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      query: {
        format: 'composed' as const,
        base: 'FROM logs-*',
        breach: { segment: 'WHERE count > 100' },
      },
      recovery_strategy: 'query' as const,
    };

    it('opens in YAML mode with sandbox when rule is non-representable', () => {
      renderFlyout({ mode: 'edit', rule: nonRepresentableRule as any });

      expect(screen.getByTestId('yamlRuleFormMock')).toBeInTheDocument();
      expect(screen.queryByTestId('composeDiscoverFormMock')).not.toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverChildMock')).toBeInTheDocument();
    });

    it('disables the edit mode toggle for non-representable rules', () => {
      renderFlyout({ mode: 'edit', rule: nonRepresentableRule as any });

      const toggle = screen.getByTestId('composeDiscoverEditModeToggle');
      const buttons = toggle.querySelectorAll('button');
      buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it('opens in form mode for representable rules', () => {
      renderFlyout({ mode: 'edit', rule: representableRule as any });

      expect(screen.getByTestId('composeDiscoverFormMock')).toBeInTheDocument();
      expect(screen.queryByTestId('yamlRuleFormMock')).not.toBeInTheDocument();
    });

    it('does not disable the toggle for representable rules', () => {
      renderFlyout({ mode: 'edit', rule: representableRule as any });

      const toggle = screen.getByTestId('composeDiscoverEditModeToggle');
      const buttons = toggle.querySelectorAll('button');
      buttons.forEach((btn) => expect(btn).not.toBeDisabled());
    });

    it('shows YAML badge instead of stepper for non-representable rules', () => {
      renderFlyout({ mode: 'edit', rule: nonRepresentableRule as any });

      expect(screen.queryByRole('group', { name: /Step \d+ of \d+/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverYamlBadge')).toBeInTheDocument();
    });
  });

  describe('recovery_strategy removal on update', () => {
    const ruleWithRecoveryStrategy = {
      id: 'test-rule-id',
      kind: 'alert' as const,
      enabled: true,
      metadata: { name: 'No breach recovery', tags: [] },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      query: {
        format: 'composed' as const,
        base: 'FROM logs-*',
        breach: { segment: 'WHERE count > 100' },
      },
      recovery_strategy: 'no_breach' as const,
    };

    it('opens in GUI mode for recovery_strategy: no_breach', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      expect(screen.getByTestId('composeDiscoverFormMock')).toBeInTheDocument();
      expect(screen.queryByTestId('yamlRuleFormMock')).not.toBeInTheDocument();
    });

    it('opens in GUI mode for recovery_strategy: none', () => {
      const rule = { ...ruleWithRecoveryStrategy, recovery_strategy: 'none' as const };
      renderFlyout({ mode: 'edit', rule: rule as any });

      expect(screen.getByTestId('composeDiscoverFormMock')).toBeInTheDocument();
      expect(screen.queryByTestId('yamlRuleFormMock')).not.toBeInTheDocument();
    });

    it('initializes recoveryType to none for recovery_strategy: none', () => {
      const rule = { ...ruleWithRecoveryStrategy, recovery_strategy: 'none' as const };
      renderFlyout({ mode: 'edit', rule: rule as any });

      const latestProps =
        mockComposeDiscoverForm.mock.calls[mockComposeDiscoverForm.mock.calls.length - 1][0];
      expect(latestProps.state.recoveryType).toBe('none');
    });

    it('initializes recoveryType to none when recovery_strategy is null', () => {
      const rule = { ...ruleWithRecoveryStrategy, recovery_strategy: undefined };
      renderFlyout({ mode: 'edit', rule: rule as any });

      const latestProps =
        mockComposeDiscoverForm.mock.calls[mockComposeDiscoverForm.mock.calls.length - 1][0];
      expect(latestProps.state.recoveryType).toBe('none');
    });

    it('initializes recoveryType to default for recovery_strategy: no_breach', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      const latestProps =
        mockComposeDiscoverForm.mock.calls[mockComposeDiscoverForm.mock.calls.length - 1][0];
      expect(latestProps.state.recoveryType).toBe('default');
    });

    it('sets recoveryType and recoveryStrategy to none when No recovery is selected', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      act(() => {
        getLatestFormProps().onRecoveryTypeChange('none');
      });

      expect(getLatestFormProps().state.recoveryType).toBe('none');
      expect(readRecoveryStrategy?.()).toBe('none');
    });

    it('sets recoveryStrategy to no_breach when Default is selected', () => {
      const rule = { ...ruleWithRecoveryStrategy, recovery_strategy: 'none' as const };
      renderFlyout({ mode: 'edit', rule: rule as any });

      act(() => {
        getLatestFormProps().onRecoveryTypeChange('default');
      });

      expect(getLatestFormProps().state.recoveryType).toBe('default');
      expect(readRecoveryStrategy?.()).toBe('no_breach');
    });

    it('clears recoveryStrategy when Custom is selected, so it is re-derived from the recovery query', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      act(() => {
        getLatestFormProps().onRecoveryTypeChange('custom');
      });

      expect(getLatestFormProps().state.recoveryType).toBe('custom');
      expect(readRecoveryStrategy?.()).toBeUndefined();
    });

    it('clears recoveryStrategy when kind changes to signal, so it is never sent for signal rules', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      expect(readRecoveryStrategy?.()).toBe('no_breach');

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      expect(readRecoveryStrategy?.()).toBeUndefined();
    });

    it('resets recoveryStrategy to no_breach when kind changes back to alert', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });
      act(() => {
        getLatestFormProps().onKindChange('alert');
      });

      expect(readRecoveryStrategy?.()).toBe('no_breach');
    });

    it('preserves noDataStrategy in form state when switching to signal (mappers omit it)', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        no_data_strategy: 'recover' as const,
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      expect(readNoDataStrategy?.()).toBe('recover');

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      expect(readNoDataStrategy?.()).toBe('recover');
      expect(readCommittedQuery?.()).toMatchObject({ format: 'standalone' });
    });

    it('keeps a manual composed query when switching to alert without re-splitting', () => {
      renderFlyout({ mode: 'create' });
      openSandbox();
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.({
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        });
      });
      clickSplitBaseAndAlert();

      const manualSplitQuery: RuleQuery = {
        format: 'composed',
        base: 'FROM custom-base',
        breach: { segment: '| WHERE custom > 1' },
      };
      act(() => {
        sandboxFlyoutProps?.onQueryChange?.(manualSplitQuery);
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });
      expect(getLatestFormProps().state.manualSplitEnabled).toBe(true);
      expect(readCommittedQuery?.()).toEqual(manualSplitQuery);

      // Re-enter the alert branch while manual split + composed are still set.
      act(() => {
        getLatestFormProps().onKindChange('alert');
      });

      expect(readKind?.()).toBe('alert');
      expect(readCommittedQuery?.()).toEqual(manualSplitQuery);
    });

    it('re-splits a merged query when switching back to alert and keeps a valid noDataStrategy', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        no_data_strategy: 'recover' as const,
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });
      act(() => {
        getLatestFormProps().onKindChange('alert');
      });

      // Heuristic restores composed base + condition; recover stays valid.
      expect(readCommittedQuery?.()).toMatchObject({
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: expect.stringMatching(/WHERE count > 100/) },
      });
      expect(readNoDataStrategy?.()).toBe('recover');
      expect(getLatestFormProps().state.childOpen).toBe(false);
    });

    it('keeps a conditionless query standalone when switching back to alert and coerces noDataStrategy', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        query: {
          format: 'standalone' as const,
          breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        },
        no_data_strategy: 'recover' as const,
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });
      act(() => {
        getLatestFormProps().onKindChange('alert');
      });

      expect(readCommittedQuery?.()).toMatchObject({ format: 'standalone' });
      expect(readNoDataStrategy?.()).toBe('none');
      expect(getLatestFormProps().state.childOpen).toBe(false);
    });

    it('silently merges a composed query to standalone when switching to signal', () => {
      renderFlyout({ mode: 'edit', rule: ruleWithRecoveryStrategy as any });

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      expect(readCommittedQuery?.()).toMatchObject({ format: 'standalone' });
      expect(readRecoveryStrategy?.()).toBeUndefined();
    });

    it('keeps a standalone query as standalone when switching to signal', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        query: {
          format: 'standalone' as const,
          breach: { query: 'FROM logs-* | WHERE count > 100' },
        },
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      act(() => {
        getLatestFormProps().onKindChange('signal');
      });

      expect(readCommittedQuery?.()).toEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | WHERE count > 100' },
      });
      expect(readRecoveryStrategy?.()).toBeUndefined();
    });

    it('keeps noDataStrategy as none when re-applying an unchanged conditionless standalone query', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        query: {
          format: 'standalone' as const,
          breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        },
        no_data_strategy: 'none' as const,
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      openSandbox();
      expect(readNoDataStrategy?.()).toBe('none');

      act(() => {
        fireEvent.click(screen.getByTestId('mockSandboxApply'));
      });

      expect(readCommittedQuery?.()).toEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
      });
      expect(readNoDataStrategy?.()).toBe('none');
    });

    it('opens in YAML mode for no_data_strategy: emit', () => {
      const rule = {
        ...ruleWithRecoveryStrategy,
        recovery_strategy: 'query' as const,
        query: {
          format: 'composed' as const,
          base: 'FROM logs-*',
          breach: { segment: 'WHERE count > 100' },
        },
        no_data_strategy: 'emit' as const,
      };
      renderFlyout({ mode: 'edit', rule: rule as any });

      expect(screen.getByTestId('yamlRuleFormMock')).toBeInTheDocument();
    });
  });
});
