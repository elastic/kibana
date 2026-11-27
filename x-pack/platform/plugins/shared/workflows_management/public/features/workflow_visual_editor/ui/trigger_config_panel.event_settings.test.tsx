/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { parse } from 'yaml';
import { I18nProvider } from '@kbn/i18n-react';
import { TriggerConfigPanel } from './trigger_config_panel';
import { triggerSchemas } from '../../../trigger_schemas';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ dataTestSubj }: { dataTestSubj?: string }) => (
    <div data-test-subj={dataTestSubj ?? 'mocked-code-editor'} />
  ),
}));
jest.mock('@kbn/monaco', () => ({ YAML_LANG_ID: 'yaml' }));
jest.mock('@kbn/workflows-ui', () => ({
  workflowsEditorChromeOverrides: {},
  ensureWorkflowGraphEuiIcons: jest.fn(),
  resolveNodeChipStyle: () => ({
    background: 'bg',
    border: 'border',
    iconColor: 'icon',
    isBrand: false,
  }),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({ StepIcon: () => <span /> }));

// The two controls have their own tests: here they only show what the panel hands them.
jest.mock('./trigger_connector_id_field', () => ({
  TriggerConnectorIdField: (props: {
    connectorType: string;
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
  }) => (
    <div>
      <span data-test-subj="connector-type">{props.connectorType}</span>
      <span data-test-subj="connector-value">{props.value}</span>
      <span data-test-subj="connector-readonly">{String(props.readOnly)}</span>
      <button type="button" data-test-subj="pick-all" onClick={() => props.onChange('*')} />
      <button
        type="button"
        data-test-subj="clear-connector"
        onClick={() => props.onChange(undefined)}
      />
    </div>
  ),
}));
jest.mock('./kql_condition_input', () => ({
  KqlConditionInput: (props: {
    value: string;
    onChange: (value: string) => void;
    eventSchema: unknown;
    readOnly?: boolean;
  }) => (
    <input
      data-test-subj="condition"
      value={props.value}
      readOnly={props.readOnly}
      data-has-schema={String(props.eventSchema !== undefined)}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

const renderPanel = (overrides: Partial<React.ComponentProps<typeof TriggerConfigPanel>> = {}) => {
  const onFragmentChange = jest.fn();
  render(
    <I18nProvider>
      <TriggerConfigPanel
        mode="edit"
        triggerType="inboundWebhook.received"
        triggerLabel="Webhook"
        initialFragment={'type: inboundWebhook.received\n'}
        onFragmentChange={onFragmentChange}
        onClose={jest.fn()}
        onRevert={jest.fn()}
        {...overrides}
      />
    </I18nProvider>
  );
  const lastFragment = () =>
    parse(onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1]?.[0] as string);
  return { onFragmentChange, lastFragment };
};

describe('TriggerConfigPanel: a connector event trigger', () => {
  it('shows a Connector and a Condition control, not the alert message', () => {
    renderPanel();

    expect(screen.getByTestId('workflowTriggerConfigPanelEventSettings')).toBeInTheDocument();
    expect(screen.getByTestId('connector-type')).toHaveTextContent('inboundWebhook');
    expect(screen.getByText('Connector')).toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.queryByText('Run only when')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowTriggerConfigPanelAlertInfo')).not.toBeInTheDocument();
  });

  it('reads the connector and the condition from the trigger', () => {
    renderPanel({
      initialFragment: `type: inboundWebhook.received\nconnector-id: abc\non:\n  condition: 'body.action: "x"'\n`,
    });

    expect(screen.getByTestId('connector-value')).toHaveTextContent('abc');
    expect(screen.getByTestId('condition')).toHaveValue('body.action: "x"');
  });

  it('writes the connector as it is picked, and removes the key when it is cleared', () => {
    const { lastFragment } = renderPanel();

    fireEvent.click(screen.getByTestId('pick-all'));
    expect(lastFragment()).toEqual({ type: 'inboundWebhook.received', 'connector-id': '*' });

    fireEvent.click(screen.getByTestId('clear-connector'));
    expect(lastFragment()).toEqual({ type: 'inboundWebhook.received' });
  });

  it('writes the condition under on, and removes it when emptied', () => {
    const { lastFragment } = renderPanel();

    fireEvent.change(screen.getByTestId('condition'), { target: { value: 'body.x: 1' } });
    expect(lastFragment()).toEqual({
      type: 'inboundWebhook.received',
      on: { condition: 'body.x: 1' },
    });

    fireEvent.change(screen.getByTestId('condition'), { target: { value: '' } });
    expect(lastFragment()).toEqual({ type: 'inboundWebhook.received' });
  });

  it('is read-only when the panel is', () => {
    renderPanel({ readOnly: true });

    expect(screen.getByTestId('connector-readonly')).toHaveTextContent('true');
    expect(screen.getByTestId('condition')).toHaveAttribute('readonly');
  });
});

describe('TriggerConfigPanel: a registered trigger that is not a connector event', () => {
  afterEach(() => jest.restoreAllMocks());

  it('has a Condition but no Connector, with the event schema for suggestions', () => {
    jest
      .spyOn(triggerSchemas, 'getTriggerDefinition')
      // Only the event schema matters to the panel.
      .mockReturnValue({ id: 'custom.event', eventSchema: {} } as never);

    renderPanel({ triggerType: 'custom.event', initialFragment: 'type: custom.event\n' });

    expect(screen.queryByTestId('connector-type')).not.toBeInTheDocument();
    expect(screen.getByTestId('condition')).toHaveAttribute('data-has-schema', 'true');
  });
});

describe('TriggerConfigPanel: a trigger with no event settings', () => {
  it('keeps the alert message for an alert trigger', () => {
    renderPanel({ triggerType: 'alert', initialFragment: 'type: alert\n' });

    expect(screen.getByTestId('workflowTriggerConfigPanelAlertInfo')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowTriggerConfigPanelEventSettings')).not.toBeInTheDocument();
  });
});
