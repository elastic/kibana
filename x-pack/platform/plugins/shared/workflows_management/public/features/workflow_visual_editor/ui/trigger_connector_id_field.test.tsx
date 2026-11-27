/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxProps } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { ConnectorInstance } from '@kbn/workflows';
import { TriggerConnectorIdField } from './trigger_connector_id_field';
import { setConnectors } from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';

// The real list is virtualized and renders no options in jsdom: this stands in for it.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const MockReact = jest.requireActual('react');
  const h = MockReact.createElement;
  const FakeComboBox = (props: EuiComboBoxProps<string>) =>
    h(
      'div',
      {
        'data-test-subj': props['data-test-subj'],
        'data-selected': (props.selectedOptions ?? []).map((o) => o.label).join('|'),
        'data-disabled': String(props.isDisabled),
      },
      (props.options ?? []).map((option) =>
        h(
          'button',
          {
            key: option.value,
            type: 'button',
            'data-test-subj': `option-${option.value}`,
            onClick: () => props.onChange?.([option]),
          },
          option.label
        )
      ),
      h('button', {
        type: 'button',
        'data-test-subj': 'clear',
        onClick: () => props.onChange?.([]),
      }),
      h('button', {
        type: 'button',
        'data-test-subj': 'type-custom',
        onClick: () => props.onCreateOption?.('  my-id  ', props.options ?? []),
      }),
      h('button', {
        type: 'button',
        'data-test-subj': 'type-blank',
        onClick: () => props.onCreateOption?.('   ', props.options ?? []),
      })
    );
  return { ...actual, EuiComboBox: FakeComboBox };
});

const instances: ConnectorInstance[] = [
  { id: 'id-zed', name: 'Zed hook', isPreconfigured: false, isDeprecated: false },
  { id: 'id-old', name: 'Old hook', isPreconfigured: false, isDeprecated: true },
  { id: 'id-alpha', name: 'Alpha hook', isPreconfigured: false, isDeprecated: false },
];

const setup = ({ value = '', readOnly = false }: { value?: string; readOnly?: boolean } = {}) => {
  const store = createMockStore();
  store.dispatch(
    setConnectors({
      connectorTypes: {
        '.inboundWebhook': {
          actionTypeId: '.inboundWebhook',
          displayName: 'Inbound webhook',
          instances,
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          subActions: [],
        },
      },
      totalConnectors: instances.length,
    })
  );
  const onChange = jest.fn();
  render(
    <Provider store={store}>
      <TriggerConnectorIdField
        connectorType="inboundWebhook"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        testSubj="connector"
      />
    </Provider>
  );
  return { onChange };
};

const optionLabels = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('data-test-subj')?.startsWith('option-'))
    .map((button) => button.textContent);

describe('TriggerConnectorIdField', () => {
  it('offers every connector of the type first, then the existing connectors by name, deprecated last', () => {
    setup();

    expect(optionLabels()).toEqual([
      'All connectors of this type',
      'Alpha hook • id-alpha',
      'Zed hook • id-zed',
      'Old hook (deprecated) • id-old',
    ]);
  });

  it('writes the id of a picked connector, and the wildcard for all of them', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByTestId('option-id-alpha'));
    fireEvent.click(screen.getByTestId('option-*'));

    expect(onChange).toHaveBeenNthCalledWith(1, 'id-alpha');
    expect(onChange).toHaveBeenNthCalledWith(2, '*');
  });

  it('takes a typed id as it is, trimmed, and ignores a blank one', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByTestId('type-custom'));
    fireEvent.click(screen.getByTestId('type-blank'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('my-id');
  });

  it('clears the value', () => {
    const { onChange } = setup({ value: 'id-alpha' });

    fireEvent.click(screen.getByTestId('clear'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows a picked connector by its label, and a value it does not know as typed', () => {
    setup({ value: 'id-alpha' });
    expect(screen.getByTestId('connector')).toHaveAttribute(
      'data-selected',
      'Alpha hook • id-alpha'
    );
  });

  it('shows an id that is no known connector as it is', () => {
    setup({ value: 'gone-123' });
    expect(screen.getByTestId('connector')).toHaveAttribute('data-selected', 'gone-123');
  });

  it('shows the wildcard as all connectors', () => {
    setup({ value: '*' });
    expect(screen.getByTestId('connector')).toHaveAttribute(
      'data-selected',
      'All connectors of this type'
    );
  });

  it('is disabled when read-only', () => {
    setup({ readOnly: true });
    expect(screen.getByTestId('connector')).toHaveAttribute('data-disabled', 'true');
  });
});
