/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';

import { FieldRuleEditor } from './field_rule_editor';
import { FieldRule } from '../../model';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

function assertField(index: number, field: string) {
  const comboEl = document.querySelector(`[data-test-subj~="fieldRuleEditorField-${index}-combo"]`);
  const expressionEl = document.querySelector(
    `[data-test-subj~="fieldRuleEditorField-${index}-expression"]`
  );

  if (index === 0) {
    expect(comboEl).toBeInTheDocument();
    expect(expressionEl).not.toBeInTheDocument();
    const input = comboEl!.querySelector('input');
    expect(input).toHaveValue(field);
  } else {
    expect(expressionEl).toBeInTheDocument();
    expect(comboEl).not.toBeInTheDocument();
    expect(expressionEl).toHaveTextContent(field);
  }
}

function assertValue(index: number, value: any) {
  const valueField = screen.getByTestId(`fieldRuleEditorValue-${index}`);
  expect(valueField).toHaveValue(value);
}

function assertValueType(index: number, type: string) {
  const valueTypeField = screen.getByTestId(`fieldRuleEditorValueType-${index}`);
  expect(valueTypeField).toHaveValue(type);
}

describe('FieldRuleEditor', () => {
  it('can render a text-based field rule', () => {
    const props = {
      rule: new FieldRule('username', '*'),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    assertField(0, 'username');
    assertValueType(0, 'text');
    assertValue(0, '*');
  });

  it('can render a number-based field rule', () => {
    const props = {
      rule: new FieldRule('username', 12),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    assertField(0, 'username');
    assertValueType(0, 'number');
    assertValue(0, 12);
  });

  it('can render a null-based field rule', () => {
    const props = {
      rule: new FieldRule('username', null),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    assertField(0, 'username');
    assertValueType(0, 'null');
    assertValue(0, '-- null --');
  });

  it('can render a boolean-based field rule (true)', () => {
    const props = {
      rule: new FieldRule('username', true),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    assertField(0, 'username');
    assertValueType(0, 'boolean');
    assertValue(0, 'true');
  });

  it('can render a boolean-based field rule (false)', () => {
    const props = {
      rule: new FieldRule('username', false),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    assertField(0, 'username');
    assertValueType(0, 'boolean');
    assertValue(0, 'false');
  });

  it('can render with alternate values specified', () => {
    const props = {
      rule: new FieldRule('username', ['*', 12, null, true, false]),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    expect(screen.getByTestId('addAlternateValueButton')).toBeInTheDocument();

    assertField(0, 'username');
    assertValueType(0, 'text');
    assertValue(0, '*');

    assertField(1, 'username');
    assertValueType(1, 'number');
    assertValue(1, 12);

    assertField(2, 'username');
    assertValueType(2, 'null');
    assertValue(2, '-- null --');

    assertField(3, 'username');
    assertValueType(3, 'boolean');
    assertValue(3, 'true');

    assertField(4, 'username');
    assertValueType(4, 'boolean');
    assertValue(4, 'false');
  });

  it('allows alternate values to be added when "allowAdd" is set to true', () => {
    const props = {
      rule: new FieldRule('username', null),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);
    fireEvent.click(screen.getByTestId('addAlternateValueButton'));
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule] = props.onChange.mock.calls[0];
    expect(updatedRule.toRaw()).toEqual({
      field: {
        username: [null, '*'],
      },
    });
  });

  it('allows values to be deleted; deleting all values invokes "onDelete"', () => {
    const props = {
      rule: new FieldRule('username', ['*', 12, null]),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const { rerender } = renderWithIntl(<FieldRuleEditor {...props} />);

    expect(screen.getAllByTestId(/fieldRuleEditorDeleteValue-\d+/)).toHaveLength(3);
    fireEvent.click(screen.getByTestId(/fieldRuleEditorDeleteValue-0$/));

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule1] = props.onChange.mock.calls[0];
    expect(updatedRule1.toRaw()).toEqual({
      field: {
        username: [12, null],
      },
    });

    props.onChange.mockReset();

    rerender(
      <I18nProvider>
        <FieldRuleEditor {...props} rule={updatedRule1} />
      </I18nProvider>
    );

    expect(screen.getAllByTestId(/fieldRuleEditorDeleteValue-\d+/)).toHaveLength(2);
    fireEvent.click(screen.getByTestId(/fieldRuleEditorDeleteValue-1$/));

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule2] = props.onChange.mock.calls[0];
    expect(updatedRule2.toRaw()).toEqual({
      field: {
        username: [12],
      },
    });

    props.onChange.mockReset();

    rerender(
      <I18nProvider>
        <FieldRuleEditor {...props} rule={updatedRule2} />
      </I18nProvider>
    );

    expect(screen.getAllByTestId(/fieldRuleEditorDeleteValue-\d+/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId(/fieldRuleEditorDeleteValue-0$/));

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('allows field data types to be changed', () => {
    const props = {
      rule: new FieldRule('username', '*'),
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    renderWithIntl(<FieldRuleEditor {...props} />);

    fireEvent.change(screen.getByTestId('fieldRuleEditorValueType-0'), {
      target: { value: 'number' },
    });

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule] = props.onChange.mock.calls[0];
    expect(updatedRule.toRaw()).toEqual({
      field: {
        username: 0,
      },
    });
  });

  describe('can render a readonly view', () => {
    it('disables all fields and hides buttons', () => {
      const props = {
        rule: new FieldRule('username', ['*', 12, null, true]),
        onChange: jest.fn(),
        onDelete: jest.fn(),
        readOnly: true,
      };

      renderWithIntl(<FieldRuleEditor {...props} />);

      expect(screen.queryByTestId('addAlternateValueButton')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/fieldRuleEditorDeleteValue/)).toHaveLength(0);

      expect(screen.getByTestId('fieldRuleEditorValueType-0')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValue-0')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValueType-1')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValue-1')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValueType-2')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValue-2')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValueType-3')).toBeDisabled();
      expect(screen.getByTestId('fieldRuleEditorValue-3')).toBeDisabled();
    });
  });
});
