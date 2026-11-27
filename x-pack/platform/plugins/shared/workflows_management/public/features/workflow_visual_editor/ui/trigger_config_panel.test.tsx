/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { TriggerConfigPanel } from './trigger_config_panel';

jest.mock('@kbn/code-editor', () => {
  return {
    CodeEditor: (props: {
      value: string;
      onChange?: (v: string) => void;
      dataTestSubj?: string;
      'aria-label'?: string;
    }) => (
      <textarea
        data-test-subj={props.dataTestSubj ?? 'mocked-code-editor'}
        aria-label={props['aria-label']}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    ),
  };
});

jest.mock('@kbn/monaco', () => ({ YAML_LANG_ID: 'yaml' }));
jest.mock('@kbn/workflows-ui', () => ({
  workflowsEditorChromeOverrides: {},
  ensureWorkflowGraphEuiIcons: jest.fn(),
  resolveNodeChipStyle: () => ({
    background: 'bg-accent',
    border: 'border-accent',
    iconColor: 'text-accent',
    isBrand: false,
  }),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: ({ iconColor }: { iconColor?: string }) => (
    <span data-test-subj="mocked-step-icon" data-icon-color={iconColor} />
  ),
}));

const renderPanel = (overrides: Partial<React.ComponentProps<typeof TriggerConfigPanel>> = {}) => {
  const onFragmentChange = jest.fn();
  const onClose = jest.fn();
  const onRevert = jest.fn();
  render(
    <I18nProvider>
      <TriggerConfigPanel
        mode="edit"
        triggerType="manual"
        triggerLabel="Manual"
        initialFragment="type: manual\n"
        onFragmentChange={onFragmentChange}
        onClose={onClose}
        onRevert={onRevert}
        {...overrides}
      />
    </I18nProvider>
  );
  const lastFragment = () =>
    onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1]?.[0] as string | undefined;
  return { onFragmentChange, onClose, onRevert, lastFragment };
};

describe('TriggerConfigPanel', () => {
  it('renders Form / YAML tabs and the accent-colored header icon', () => {
    renderPanel();
    expect(screen.getByTestId('workflowTriggerConfigPanelTitle')).toHaveTextContent('Manual');
    expect(screen.getByTestId('workflowTriggerConfigPanelTabs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigPanelInputs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigInput-empty')).toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowTriggerConfigPanelAccordion-inputs')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('mocked-step-icon')).toHaveAttribute(
      'data-icon-color',
      'text-accent'
    );
  });

  it('applies a manual input as JSON-Schema-shaped inputs as soon as it is added', () => {
    const { lastFragment } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowTriggerConfigInput-add'));
    fireEvent.change(screen.getByTestId(/workflowTriggerConfigInput-name-/), {
      target: { value: 'environment' },
    });

    const fragment = lastFragment() as string;
    expect(fragment).toContain('type: manual');
    expect(fragment).toContain('environment');
    expect(fragment).toContain('properties');
    expect(fragment).toContain('string');
  });

  it('shows the input form, not the raw schema editor, for a legacy input of type array', () => {
    renderPanel({
      initialFragment:
        'type: manual\ninputs:\n  - name: ids\n    type: array\n    default:\n      - a\n      - b\n',
    });

    expect(screen.getAllByTestId(/^workflowTriggerConfigInput-name-/)).toHaveLength(1);
    expect(screen.queryByTestId('workflowTriggerConfigPanelInputsSchema')).not.toBeInTheDocument();
  });

  it('does not render an input builder for alert triggers', () => {
    renderPanel({
      triggerType: 'alert',
      triggerLabel: 'Alert',
      initialFragment: 'type: alert\n',
    });
    expect(screen.queryByTestId('workflowTriggerConfigPanelInputs')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigPanelAlertInfo')).toBeInTheDocument();
  });

  it('applies the scheduled interval as it is edited', () => {
    const { lastFragment } = renderPanel({
      triggerType: 'scheduled',
      triggerLabel: 'Scheduled',
      initialFragment: 'type: scheduled\nwith:\n  every: 5m\n',
    });
    expect(screen.getByTestId('workflowTriggerConfigPanelEvery')).toHaveValue('5m');
    fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelEvery'), {
      target: { value: '15m' },
    });
    expect(lastFragment()).toContain('15m');
  });

  it('applies YAML tab edits', () => {
    const { lastFragment } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelView-yaml'));
    fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelYaml'), {
      target: {
        value: 'type: manual\ninputs:\n  - name: dry_run\n    type: boolean\n    default: true\n',
      },
    });
    expect(lastFragment()).toContain('dry_run');
  });

  it('does not apply a draft that is not valid YAML', () => {
    const { onFragmentChange } = renderPanel();
    onFragmentChange.mockClear();
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelView-yaml'));
    fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelYaml'), {
      target: { value: 'type: [manual' },
    });

    expect(onFragmentChange).not.toHaveBeenCalled();
  });

  describe('footer', () => {
    it('of a new trigger offers only Remove trigger', () => {
      const { onRevert } = renderPanel({ mode: 'insert' });

      expect(screen.queryByTestId('workflowTriggerConfigPanelSave')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workflowTriggerConfigPanelCancel')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('workflowTriggerConfigPanelResetTrigger')
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelRemoveTrigger'));

      expect(screen.getByTestId('workflowTriggerConfigPanelRemoveTrigger')).toHaveTextContent(
        'Remove trigger'
      );
      expect(onRevert).toHaveBeenCalledTimes(1);
    });

    it('of an existing trigger offers only Reset trigger, which waits for a change', () => {
      const { onRevert } = renderPanel({
        mode: 'edit',
        triggerType: 'scheduled',
        triggerLabel: 'Scheduled',
        initialFragment: 'type: scheduled\nwith:\n  every: 5m\n',
      });
      const reset = screen.getByTestId('workflowTriggerConfigPanelResetTrigger');

      expect(screen.queryByTestId('workflowTriggerConfigPanelSave')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workflowTriggerConfigPanelCancel')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('workflowTriggerConfigPanelRemoveTrigger')
      ).not.toBeInTheDocument();
      expect(reset).toHaveTextContent('Reset trigger');
      expect(reset).toBeDisabled();

      fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelEvery'), {
        target: { value: '15m' },
      });
      expect(reset).toBeEnabled();
      fireEvent.click(reset);

      expect(onRevert).toHaveBeenCalledTimes(1);
    });
  });

  describe('the close button', () => {
    it('just closes: what was edited is already applied', () => {
      const { onClose, onRevert } = renderPanel();

      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelClose'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onRevert).not.toHaveBeenCalled();
    });

    it('asks before throwing away a draft that is not valid YAML', () => {
      const { onClose } = renderPanel();
      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelView-yaml'));
      fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelYaml'), {
        target: { value: 'type: [manual' },
      });

      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelClose'));
      expect(screen.getByTestId('workflowTriggerConfigPanelDiscardModal')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Keep editing'));
      expect(
        screen.queryByTestId('workflowTriggerConfigPanelDiscardModal')
      ).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelClose'));
      fireEvent.click(screen.getByText('Discard'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('read-only', () => {
    const MANUAL_WITH_INPUT =
      'type: manual\ninputs:\n  properties:\n    environment:\n      type: string\n';

    it('lists the manual inputs without add or remove controls and with inert fields', () => {
      renderPanel({ readOnly: true, initialFragment: MANUAL_WITH_INPUT });

      expect(screen.getByTestId(/workflowTriggerConfigInput-name-/)).toHaveValue('environment');
      expect(screen.getByTestId(/workflowTriggerConfigInput-name-/)).toBeDisabled();
      expect(screen.queryByTestId('workflowTriggerConfigInput-add')).not.toBeInTheDocument();
      expect(screen.queryByTestId(/workflowTriggerConfigInput-remove-/)).not.toBeInTheDocument();
    });

    it('offers no add control for a trigger with no inputs', () => {
      renderPanel({ readOnly: true });

      expect(screen.getByTestId('workflowTriggerConfigInput-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowTriggerConfigInput-add')).not.toBeInTheDocument();
    });

    it('disables the scheduled interval', () => {
      renderPanel({
        readOnly: true,
        triggerType: 'scheduled',
        triggerLabel: 'Scheduled',
        initialFragment: 'type: scheduled\nwith:\n  every: 5m\n',
      });

      expect(screen.getByTestId('workflowTriggerConfigPanelEvery')).toBeDisabled();
    });

    it('offers only Close in the footer and never applies anything', () => {
      const { onClose, onRevert, onFragmentChange } = renderPanel({ readOnly: true });

      expect(
        screen.queryByTestId('workflowTriggerConfigPanelResetTrigger')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('workflowTriggerConfigPanelRemoveTrigger')
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelFooterClose'));

      expect(screen.getByTestId('workflowTriggerConfigPanelFooterClose')).toHaveTextContent(
        'Close'
      );
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onRevert).not.toHaveBeenCalled();
      expect(onFragmentChange).not.toHaveBeenCalled();
    });

    it('stays editable by default (positive control)', () => {
      renderPanel();

      expect(screen.getByTestId('workflowTriggerConfigInput-add')).toBeInTheDocument();
      expect(screen.getByTestId('workflowTriggerConfigPanelResetTrigger')).toBeInTheDocument();
    });
  });
});
