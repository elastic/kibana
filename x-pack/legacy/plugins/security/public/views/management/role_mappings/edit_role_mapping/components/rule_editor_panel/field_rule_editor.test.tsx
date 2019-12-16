/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FieldRuleEditor } from './field_rule_editor';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { FieldRule } from '../../../model';
import { findTestSubject } from 'test_utils/find_test_subject';
import { ReactWrapper } from 'enzyme';

function assertField(wrapper: ReactWrapper<any, any, any>, index: number, field: string) {
  const isFirst = index === 0;
  if (isFirst) {
    expect(
      wrapper.find(`EuiComboBox[data-test-subj~="fieldRuleEditorField-${index}"]`).props()
    ).toMatchObject({
      selectedOptions: [{ label: field }],
    });

    expect(findTestSubject(wrapper, `fieldRuleEditorField-${index}-combo`)).toHaveLength(1);
    expect(findTestSubject(wrapper, `fieldRuleEditorField-${index}-expression`)).toHaveLength(0);
  } else {
    expect(
      wrapper.find(`EuiExpression[data-test-subj~="fieldRuleEditorField-${index}"]`).props()
    ).toMatchObject({
      value: field,
    });

    expect(findTestSubject(wrapper, `fieldRuleEditorField-${index}-combo`)).toHaveLength(0);
    expect(findTestSubject(wrapper, `fieldRuleEditorField-${index}-expression`)).toHaveLength(1);
  }
}

function assertValueType(wrapper: ReactWrapper<any, any, any>, index: number, type: string) {
  const valueTypeField = findTestSubject(wrapper, `fieldRuleEditorValueType-${index}`);
  expect(valueTypeField.props()).toMatchObject({ value: type });
}

function assertValue(wrapper: ReactWrapper<any, any, any>, index: number, value: any) {
  const valueField = findTestSubject(wrapper, `fieldRuleEditorValue-${index}`);
  expect(valueField.props()).toMatchObject({ value });
}

describe('FieldRuleEditor', () => {
  it('can render a text-based field rule', () => {
    const props = {
      rule: new FieldRule('username', '*'),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'text');
    assertValue(wrapper, 0, '*');
  });

  it('can render a number-based field rule', () => {
    const props = {
      rule: new FieldRule('username', 12),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'number');
    assertValue(wrapper, 0, 12);
  });

  it('can render a null-based field rule', () => {
    const props = {
      rule: new FieldRule('username', null),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'null');
    assertValue(wrapper, 0, '-- null --');
  });

  it('can render a boolean-based field rule (true)', () => {
    const props = {
      rule: new FieldRule('username', true),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'boolean');
    assertValue(wrapper, 0, 'true');
  });

  it('can render a boolean-based field rule (false)', () => {
    const props = {
      rule: new FieldRule('username', false),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'boolean');
    assertValue(wrapper, 0, 'false');
  });

  it('can render with alternate values specified', () => {
    const props = {
      rule: new FieldRule('username', ['*', 12, null, true, false]),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    expect(findTestSubject(wrapper, 'addAlternateValueButton')).toHaveLength(1);

    assertField(wrapper, 0, 'username');
    assertValueType(wrapper, 0, 'text');
    assertValue(wrapper, 0, '*');

    assertField(wrapper, 1, 'username');
    assertValueType(wrapper, 1, 'number');
    assertValue(wrapper, 1, 12);

    assertField(wrapper, 2, 'username');
    assertValueType(wrapper, 2, 'null');
    assertValue(wrapper, 2, '-- null --');

    assertField(wrapper, 3, 'username');
    assertValueType(wrapper, 3, 'boolean');
    assertValue(wrapper, 3, 'true');

    assertField(wrapper, 4, 'username');
    assertValueType(wrapper, 4, 'boolean');
    assertValue(wrapper, 4, 'false');
  });

  it('allows alternate values to be added when "allowAdd" is set to true', () => {
    const props = {
      rule: new FieldRule('username', null),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);
    findTestSubject(wrapper, 'addAlternateValueButton').simulate('click');
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
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);

    expect(findTestSubject(wrapper, `fieldRuleEditorDeleteValue`)).toHaveLength(3);
    findTestSubject(wrapper, `fieldRuleEditorDeleteValue-0`).simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule1] = props.onChange.mock.calls[0];
    expect(updatedRule1.toRaw()).toEqual({
      field: {
        username: [12, null],
      },
    });

    props.onChange.mockReset();

    // simulate updated rule being fed back in
    wrapper.setProps({ rule: updatedRule1 });

    expect(findTestSubject(wrapper, `fieldRuleEditorDeleteValue`)).toHaveLength(2);
    findTestSubject(wrapper, `fieldRuleEditorDeleteValue-1`).simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule2] = props.onChange.mock.calls[0];
    expect(updatedRule2.toRaw()).toEqual({
      field: {
        username: [12],
      },
    });

    props.onChange.mockReset();

    // simulate updated rule being fed back in
    wrapper.setProps({ rule: updatedRule2 });

    expect(findTestSubject(wrapper, `fieldRuleEditorDeleteValue`)).toHaveLength(1);
    findTestSubject(wrapper, `fieldRuleEditorDeleteValue-0`).simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('allows alternate values to be deleted, but at least one must remain, if "allowDelete" is set to false', () => {
    const props = {
      rule: new FieldRule('username', ['*', null]),
      allowDelete: false,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);

    expect(findTestSubject(wrapper, `fieldRuleEditorDeleteValue`)).toHaveLength(2);
    findTestSubject(wrapper, `fieldRuleEditorDeleteValue-0`).simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule1] = props.onChange.mock.calls[0];
    expect(updatedRule1.toRaw()).toEqual({
      field: {
        username: [null],
      },
    });

    props.onChange.mockReset();

    // simulate updated rule being fed back in
    wrapper.setProps({ rule: updatedRule1 });

    // only one rule left; no delete available
    expect(findTestSubject(wrapper, `fieldRuleEditorDeleteValue`)).toHaveLength(0);
  });

  it('allows field data types to be changed', () => {
    const props = {
      rule: new FieldRule('username', '*'),
      allowDelete: true,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };

    const wrapper = mountWithIntl(<FieldRuleEditor {...props} />);

    const { onChange } = findTestSubject(wrapper, `fieldRuleEditorValueType-0`).props();
    onChange!({ target: { value: 'number' } as any } as any);

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule] = props.onChange.mock.calls[0];
    expect(updatedRule.toRaw()).toEqual({
      field: {
        username: 0,
      },
    });
  });
});
