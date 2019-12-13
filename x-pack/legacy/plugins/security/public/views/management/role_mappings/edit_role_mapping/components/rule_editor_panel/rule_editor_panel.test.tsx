/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { RuleEditorPanel } from '.';
import { VisualRuleEditor } from './visual_rule_editor';
import { AdvancedRuleEditor } from './advanced_rule_editor';
import { findTestSubject } from 'test_utils/find_test_subject';

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import 'test_utils/stub_web_worker';
import { AllRule, FieldRule } from '../../../model';

describe('RuleEditorPanel', () => {
  it('renders the visual editor when no rules are defined', () => {
    const props = {
      rawRules: {},
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);
    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(0);
  });

  it('allows switching to the advanced editor, carrying over rules', () => {
    const props = {
      rawRules: {
        all: [
          {
            field: {
              username: ['*'],
            },
          },
        ],
      },
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);
    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(0);

    findTestSubject(wrapper, 'roleMappingsAdvancedRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);

    const advancedEditor = wrapper.find(AdvancedRuleEditor);
    expect(advancedEditor).toHaveLength(1);
    const { rules } = advancedEditor.props();
    expect(rules!.toRaw()).toEqual(props.rawRules);
  });

  it('allows switching to the visual editor, carrying over rules', () => {
    const props = {
      rawRules: {},
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);
    findTestSubject(wrapper, 'roleMappingsAdvancedRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(1);

    const advancedEditor = wrapper.find(AdvancedRuleEditor);
    expect(advancedEditor).toHaveLength(1);
    const { rules: initialRules, onChange } = advancedEditor.props();
    expect(initialRules).toBeNull();
    onChange(new AllRule([new FieldRule('username', '*')]));

    findTestSubject(wrapper, 'roleMappingsVisualRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(0);

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [rules] = props.onChange.mock.calls[0];
    expect(rules).toEqual({
      all: [{ field: { username: '*' } }],
    });
  });
});
