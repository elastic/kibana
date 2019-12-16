/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { VisualRuleEditor } from './visual_rule_editor';
import { findTestSubject } from 'test_utils/find_test_subject';
import {
  AnyRule,
  AllRule,
  FieldRule,
  ExceptAnyRule,
  ExceptAllRule,
  ExceptFieldRule,
} from '../../../model';
import { RuleGroupEditor } from './rule_group_editor';
import { FieldRuleEditor } from './field_rule_editor';

describe('VisualRuleEditor', () => {
  it('renders an empty prompt when no rules are defined', () => {
    const props = {
      rules: null,
      maxDepth: 0,
      onSwitchEditorMode: jest.fn(),
      onChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<VisualRuleEditor {...props} />);

    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule.toRaw()).toEqual({
      all: [{ field: { username: '*' } }],
    });
  });

  it('adds a rule group when the "Add rules" button is clicked', () => {
    const props = {
      rules: null,
      maxDepth: 0,
      onSwitchEditorMode: jest.fn(),
      onChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<VisualRuleEditor {...props} />);
    expect(findTestSubject(wrapper, 'roleMappingsNoRulesDefined')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingsRulesTooComplex')).toHaveLength(0);
  });

  it('clicking the add button when no rules are defined populates an initial rule set', () => {
    const props = {
      rules: null,
      maxDepth: 0,
      onSwitchEditorMode: jest.fn(),
      onChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<VisualRuleEditor {...props} />);
    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule).toBeInstanceOf(AllRule);
    expect(newRule.toRaw()).toEqual({
      all: [
        {
          field: {
            username: '*',
          },
        },
      ],
    });
  });

  it('renders a nested rule set', () => {
    const props = {
      rules: new AllRule([
        new AnyRule([new FieldRule('username', '*')]),
        new ExceptAnyRule([
          new FieldRule('metadata.foo.bar', '*'),
          new AllRule([new FieldRule('realm', 'special-one')]),
        ]),
        new ExceptAllRule([new FieldRule('realm', '*')]),
        new ExceptFieldRule(new FieldRule('dn', '*')),
      ]),
      maxDepth: 4,
      onSwitchEditorMode: jest.fn(),
      onChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<VisualRuleEditor {...props} />);

    expect(wrapper.find(RuleGroupEditor)).toHaveLength(6);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(5);
    expect(findTestSubject(wrapper, 'roleMappingsRulesTooComplex')).toHaveLength(0);
  });

  it('warns when the rule set is too complex', () => {
    const props = {
      rules: new AllRule([
        new AnyRule([
          new AllRule([
            new AnyRule([
              new AllRule([
                new AnyRule([
                  new AllRule([
                    new AnyRule([
                      new AllRule([
                        new AnyRule([
                          new AllRule([
                            new AnyRule([
                              new AnyRule([
                                new AllRule([new AnyRule([new FieldRule('username', '*')])]),
                              ]),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      maxDepth: 11,
      onSwitchEditorMode: jest.fn(),
      onChange: jest.fn(),
    };
    const wrapper = mountWithIntl(<VisualRuleEditor {...props} />);
    expect(findTestSubject(wrapper, 'roleMappingsRulesTooComplex')).toHaveLength(1);
  });
});
