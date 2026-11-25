/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RootlyAlertsParamsFields } from './rootly_alerts_params';
import type { RootlyAlertsActionParams } from './types';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  TextFieldWithMessageVariables: ({
    paramsProperty,
    inputTargetValue,
  }: {
    paramsProperty: string;
    inputTargetValue?: string;
  }) => <input data-test-subj={`${paramsProperty}Input`} value={inputTargetValue ?? ''} readOnly />,
  TextAreaWithMessageVariables: ({ paramsProperty }: { paramsProperty: string }) => (
    <textarea data-test-subj={`${paramsProperty}TextArea`} />
  ),
}));

const renderParams = (
  actionParams: RootlyAlertsActionParams,
  errors: Record<string, string[]> = {}
) => {
  const editAction = jest.fn();
  render(
    <RootlyAlertsParamsFields
      actionParams={actionParams}
      errors={errors}
      editAction={editAction}
      index={0}
    />
  );
  return editAction;
};

const getPreview = () =>
  JSON.parse(within(screen.getByTestId('rootlyAlertsPreview')).getByRole('code').textContent ?? '');

describe('RootlyAlertsParamsFields renders', () => {
  const trigger: RootlyAlertsActionParams = {
    event: 'trigger',
    dedupKey: 'rule:alert',
    title: 'Error count is high',
    match: { on: 'service', value: 'checkout-api' },
  };

  test('all params fields are rendered for a trigger', () => {
    renderParams(trigger);

    expect(screen.getByTestId('rootlyAlertsEventSelect')).toHaveValue('trigger');
    expect(screen.getByTestId('dedupKeyInput')).toHaveValue('rule:alert');
    expect(screen.getByTestId('titleInput')).toHaveValue('Error count is high');
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('urlInput')).toBeInTheDocument();
    expect(screen.getByTestId('urgencyInput')).toBeInTheDocument();
    expect(screen.getByTestId('rootlyAlertsRoutingFieldSelect')).toHaveValue('service');
    expect(screen.getByTestId('routingValueInput')).toHaveValue('checkout-api');
    expect(screen.getByLabelText('Use alert routes')).toBeChecked();
    expect(screen.getByTestId('rootlyAlertsLabelAdd')).toBeInTheDocument();
    expect(
      screen.getByText('Labels are not applied when using a generic webhook alert source.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('customDetailsTextArea')).toBeInTheDocument();
  });

  test('the event defaults to trigger', () => {
    renderParams({});

    expect(screen.getByTestId('rootlyAlertsEventSelect')).toHaveValue('trigger');
    expect(screen.getByTestId('titleInput')).toBeInTheDocument();
  });

  test('only the event and dedupKey are rendered for a resolve', () => {
    renderParams({ ...trigger, event: 'resolve' });

    expect(screen.getByTestId('dedupKeyInput')).toHaveValue('rule:alert');
    expect(screen.queryByTestId('titleInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rootlyAlertsRoutingFieldSelect')).not.toBeInTheDocument();
    expect(getPreview()).toEqual({ event: 'resolve', dedup_key: 'rule:alert' });
  });

  test('the events offered are trigger and resolve', () => {
    renderParams(trigger);

    const options = within(screen.getByTestId('rootlyAlertsEventSelect')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Trigger', 'Resolve']);
  });

  test('changing the event edits the action', () => {
    const editAction = renderParams(trigger);

    fireEvent.change(screen.getByTestId('rootlyAlertsEventSelect'), {
      target: { value: 'resolve' },
    });
    expect(editAction).toHaveBeenCalledWith('event', 'resolve', 0);
  });

  test('changing the match type replaces the match in one edit', () => {
    const editAction = renderParams(trigger);

    fireEvent.change(screen.getByTestId('rootlyAlertsRoutingFieldSelect'), {
      target: { value: 'team' },
    });
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('match', { on: 'team' }, 0);
  });

  test('the catalog slug is rendered only for a custom catalog', () => {
    const match = { on: 'catalog' as const, catalog: 'regions', value: 'eu-west' };
    const editAction = renderParams({ ...trigger, match });

    fireEvent.change(screen.getByTestId('rootlyAlertsCatalogInput'), {
      target: { value: 'zones' },
    });
    expect(editAction).toHaveBeenCalledWith('match', { ...match, catalog: 'zones' }, 0);
  });

  test('the catalog slug is not rendered for the other match types', () => {
    renderParams(trigger);

    expect(screen.queryByTestId('rootlyAlertsCatalogInput')).not.toBeInTheDocument();
  });

  test('choosing a specific target starts a target in one edit', () => {
    const editAction = renderParams(trigger);

    fireEvent.click(screen.getByLabelText('Page a specific target'));
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('target', { type: 'service' }, 0);
  });

  test('the target fields are rendered in place of the match fields', () => {
    const target = { type: 'escalation_policy' as const, id: 'abc-123' };
    const editAction = renderParams({ ...trigger, target });

    expect(screen.getByLabelText('Page a specific target')).toBeChecked();
    expect(screen.getByTestId('rootlyAlertsTargetTypeSelect')).toHaveValue('escalation_policy');
    expect(screen.getByTestId('targetIdInput')).toHaveValue('abc-123');
    expect(screen.queryByTestId('rootlyAlertsRoutingFieldSelect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('routingValueInput')).not.toBeInTheDocument();

    expect(screen.getByText('Rootly escalation policy ID')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('rootlyAlertsTargetTypeSelect'), {
      target: { value: 'team' },
    });
    expect(editAction).toHaveBeenLastCalledWith('target', { type: 'team' }, 0);
  });

  test('choosing alert routes removes the target', () => {
    const editAction = renderParams({ ...trigger, target: { type: 'service', id: 'abc-123' } });

    fireEvent.click(screen.getByLabelText('Use alert routes'));
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('target', undefined, 0);
  });

  test('labels are added, edited and removed as a whole list', () => {
    const labels = [{ key: 'region', value: 'us-east-1' }];
    const editAction = renderParams({ ...trigger, labels });

    expect(screen.getByTestId('rootlyAlertsLabelKey-0')).toHaveValue('region');
    expect(screen.getByTestId('labelValue-0Input')).toHaveValue('us-east-1');

    fireEvent.click(screen.getByTestId('rootlyAlertsLabelAdd'));
    expect(editAction).toHaveBeenLastCalledWith('labels', [...labels, { key: '', value: '' }], 0);

    fireEvent.change(screen.getByTestId('rootlyAlertsLabelKey-0'), { target: { value: 'env' } });
    expect(editAction).toHaveBeenLastCalledWith('labels', [{ key: 'env', value: 'us-east-1' }], 0);

    fireEvent.click(screen.getByTestId('rootlyAlertsLabelRemove-0'));
    expect(editAction).toHaveBeenLastCalledWith('labels', [], 0);
  });

  test('errors are rendered', () => {
    renderParams(
      { ...trigger, match: { on: 'catalog', value: 'eu-west' } },
      {
        dedupKey: ['Deduplication key is required.'],
        match: ['Catalog slug is required.'],
        labels: ['Label name is required.'],
      }
    );

    expect(screen.getByText('Deduplication key is required.')).toBeInTheDocument();
    expect(screen.getByText('Catalog slug is required.')).toBeInTheDocument();
    expect(screen.getByText('Label name is required.')).toBeInTheDocument();
  });

  test('the preview shows the event body', () => {
    renderParams({ ...trigger, urgency: 'High', labels: [{ key: 'region', value: 'us-east-1' }] });

    expect(getPreview()).toMatchObject({
      event: 'trigger',
      dedup_key: 'rule:alert',
      title: 'Error count is high',
      urgency: 'High',
      service: 'checkout-api',
      labels: { region: 'us-east-1' },
    });
  });

  test('the preview shows a target without the routing value', () => {
    renderParams({ ...trigger, target: { type: 'user', id: '42' } });

    const preview = getPreview();
    expect(preview.rootly).toEqual({ notification_target: { type: 'User', id: '42' } });
    expect(preview).not.toHaveProperty('service');
  });

  test('the preview shows that an empty dedupKey is generated', () => {
    renderParams({ ...trigger, dedupKey: '' });

    expect(getPreview().dedup_key).toBe('(generated)');
  });

  test('the preview shows the rule and alert IDs for an empty dedupKey in a rule', () => {
    renderParams({ ...trigger, dedupKey: '', ruleId: '{{rule.id}}', alertId: '{{alert.id}}' });

    expect(getPreview().dedup_key).toBe('{{rule.id}}:{{alert.id}}');
  });

  test('the preview shows an error when customDetails is not valid JSON', () => {
    renderParams({ ...trigger, customDetails: '{' });

    expect(within(screen.getByTestId('rootlyAlertsPreview')).getByRole('code')).toHaveTextContent(
      'Custom details must be a valid JSON object.'
    );
  });
});
