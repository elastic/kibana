/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';

import { AddRuleButton } from './add_rule_button';
import { FieldRuleEditor } from './field_rule_editor';
import { RuleGroupEditor } from './rule_group_editor';
import { RuleGroupTitle } from './rule_group_title';
import { AllRule, AnyRule, ExceptAnyRule, FieldRule } from '../../model';

describe('RuleGroupEditor', () => {
  it('renders an empty group', () => {
    const props = {
      rule: new AllRule([]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = shallowWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(0);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(0);
    expect(wrapper.find(AddRuleButton)).toHaveLength(1);
  });

  it('allows the group type to be changed, maintaining child rules', async () => {
    const props = {
      rule: new AllRule([new FieldRule('username', '*')]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(1);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(1);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(1);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule).toBeInstanceOf(AnyRule);
    expect(newRule.toRaw()).toEqual(new AnyRule([new FieldRule('username', '*')]).toRaw());
  });

  it('warns when changing group types which would invalidate child rules', async () => {
    const props = {
      rule: new AllRule([new ExceptAnyRule([new FieldRule('my_custom_field', 'foo*')])]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(2);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(2);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(2);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').first().simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(findTestSubject(wrapper, 'confirmRuleChangeModal')).toHaveLength(1);
    findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule).toBeInstanceOf(AnyRule);

    // new rule should a defaulted field sub rule, as the existing rules are not valid for the new type
    expect(newRule.toRaw()).toEqual(new AnyRule([new FieldRule('username', '*')]).toRaw());
  });

  it('does not change groups when canceling the confirmation', async () => {
    const props = {
      rule: new AllRule([new ExceptAnyRule([new FieldRule('username', '*')])]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(2);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(2);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(2);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').first().simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(findTestSubject(wrapper, 'confirmRuleChangeModal')).toHaveLength(1);
    findTestSubject(wrapper, 'confirmModalCancelButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
  });

  it('hides the add rule button when instructed to', () => {
    const props = {
      rule: new AllRule([]),
      allowAdd: false,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = shallowWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(AddRuleButton)).toHaveLength(0);
  });

  it('can render a readonly view', async () => {
    const props = {
      rule: new AllRule([new ExceptAnyRule([new FieldRule('my_custom_field', 'foo*')])]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
      readOnly: true,
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);

    // Any/all title selectors are read-only
    const ruleGroupTitles = wrapper.find(RuleGroupTitle);
    expect(ruleGroupTitles).not.toHaveLength(0);
    ruleGroupTitles.map((title) => {
      expect(title.props().readOnly).toBeTruthy();
    });

    // Any/all title links are disabled
    const titleLinks = wrapper.find('EuiLink[data-test-subj="ruleGroupTitle"]');
    expect(titleLinks).not.toHaveLength(0);
    titleLinks.map((titleLink) => {
      expect(titleLink.props().disabled).toBeTruthy();
    });

    // No goup delete buttons
    const groupDeleteButtons = wrapper.find(
      'EuiButtonEmpty[data-test-subj="deleteRuleGroupButton"]'
    );
    expect(groupDeleteButtons).toHaveLength(0);

    // No add rule buttons
    expect(wrapper.find(AddRuleButton)).toHaveLength(0);

    // Any/all sub groups are read-only
    const groupEditors = wrapper.find(RuleGroupEditor);
    expect(groupEditors).not.toHaveLength(0);
    groupEditors.map((groupEditor) => {
      expect(groupEditor.props().readOnly).toBeTruthy();
    });

    // Any/all field rules are read-only
    const fieldEditors = wrapper.find(FieldRuleEditor);
    expect(fieldEditors).not.toHaveLength(0);
    fieldEditors.map((fieldEditor) => {
      expect(fieldEditor.props().readOnly).toBeTruthy();
    });
  });
});
