/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'brace';
import 'brace/mode/json';

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import 'test_utils/stub_web_worker';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { JSONRuleEditor } from './json_rule_editor';
import { EuiCodeEditor } from '@elastic/eui';
import { AllRule, AnyRule, FieldRule, ExceptAnyRule, ExceptAllRule } from '../../../model';

describe('JSONRuleEditor', () => {
  it('renders an empty rule set', () => {
    const props = {
      rules: null,
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<JSONRuleEditor {...props} />);

    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onValidityChange).not.toHaveBeenCalled();

    expect(wrapper.find(EuiCodeEditor).props().value).toMatchInlineSnapshot(`"{}"`);
  });

  it('renders a rule set', () => {
    const props = {
      rules: new AllRule([
        new AnyRule([new FieldRule('username', '*')]),
        new ExceptAnyRule([
          new FieldRule('metadata.foo.bar', '*'),
          new AllRule([new FieldRule('realm.name', 'special-one')]),
        ]),
        new ExceptAllRule([new FieldRule('realm.name', '*')]),
      ]),
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<JSONRuleEditor {...props} />);

    const { value } = wrapper.find(EuiCodeEditor).props();
    expect(JSON.parse(value)).toEqual({
      all: [
        {
          any: [{ field: { username: '*' } }],
        },
        {
          except: {
            any: [
              { field: { 'metadata.foo.bar': '*' } },
              {
                all: [{ field: { ['realm.name']: 'special-one' } }],
              },
            ],
          },
        },
        {
          except: {
            all: [{ field: { ['realm.name']: '*' } }],
          },
        },
      ],
    });
  });

  it('notifies when input contains invalid JSON', () => {
    const props = {
      rules: null,
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<JSONRuleEditor {...props} />);

    const allRule = JSON.stringify(new AllRule().toRaw());
    act(() => {
      wrapper
        .find(EuiCodeEditor)
        .props()
        .onChange(allRule + ', this makes invalid JSON');
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('notifies when input contains an invalid rule set, even if it is valid JSON', () => {
    const props = {
      rules: null,
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<JSONRuleEditor {...props} />);

    const invalidRule = JSON.stringify({
      all: [
        {
          field: {
            foo: {},
          },
        },
      ],
    });

    act(() => {
      wrapper
        .find(EuiCodeEditor)
        .props()
        .onChange(invalidRule);
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('fires onChange when a valid rule set is provided after being previously invalidated', () => {
    const props = {
      rules: null,
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<JSONRuleEditor {...props} />);

    const allRule = JSON.stringify(new AllRule().toRaw());
    act(() => {
      wrapper
        .find(EuiCodeEditor)
        .props()
        .onChange(allRule + ', this makes invalid JSON');
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();

    props.onValidityChange.mockReset();

    act(() => {
      wrapper
        .find(EuiCodeEditor)
        .props()
        .onChange(allRule);
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(true);

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule] = props.onChange.mock.calls[0];
    expect(JSON.stringify(updatedRule.toRaw())).toEqual(allRule);
  });
});
