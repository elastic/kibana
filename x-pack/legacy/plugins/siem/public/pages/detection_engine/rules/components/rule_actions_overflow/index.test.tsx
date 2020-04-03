/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import { deleteRulesAction, duplicateRulesAction } from '../../all/actions';
import { RuleActionsOverflow } from './index';
import { mockRule } from '../../all/__mocks__/mock';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../all/actions', () => ({
  deleteRulesAction: jest.fn(),
  duplicateRulesAction: jest.fn(),
}));

describe('RuleActionsOverflow', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('there is at least one item when there is a rule within the rules-details-menu-panel', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    const items: unknown[] = wrapper
      .find('[data-test-subj="rules-details-menu-panel"]')
      .first()
      .prop('items');

    expect(items.length).toBeGreaterThan(0);
  });

  test('items are empty when there is a null rule within the rules-details-menu-panel', () => {
    const wrapper = mount(<RuleActionsOverflow rule={null} userHasNoPermissions={false} />);
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="rules-details-menu-panel"]')
        .first()
        .prop('items')
    ).toEqual([]);
  });

  test('it opens the popover when rules-details-popover-button-icon is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="rules-details-popover"]')
        .first()
        .prop('isOpen')
    ).toEqual(true);
  });

  test('it closes the popover when rules-details-export-rule is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="rules-details-popover"]')
        .first()
        .prop('isOpen')
    ).toEqual(false);
  });

  test('it closes the popover when rules-details-duplicate-rule is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="rules-details-popover"]')
        .first()
        .prop('isOpen')
    ).toEqual(false);
  });

  test('it closes the popover when rules-details-delete-rule is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="rules-details-popover"]')
        .first()
        .prop('isOpen')
    ).toEqual(false);
  });

  test('it calls deleteRulesAction when rules-details-delete-rule is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
    wrapper.update();
    expect(deleteRulesAction).toHaveBeenCalled();
  });

  test('it calls deleteRulesAction with the rule.id when rules-details-delete-rule is clicked', () => {
    const rule = mockRule('id');
    const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
    wrapper.update();
    expect(deleteRulesAction).toHaveBeenCalledWith(
      [rule.id],
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  test('it calls duplicateRulesAction when rules-details-duplicate-rule is clicked', () => {
    const wrapper = mount(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
    wrapper.update();
    expect(duplicateRulesAction).toHaveBeenCalled();
  });

  test('it calls duplicateRulesAction with the rule and rule.id when rules-details-duplicate-rule is clicked', () => {
    const rule = mockRule('id');
    const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
    wrapper.update();
    expect(duplicateRulesAction).toHaveBeenCalledWith(
      [rule],
      [rule.id],
      expect.anything(),
      expect.anything()
    );
  });

  test('it sets the rule.rule_id on the generic downloader when rules-details-export-rule is clicked', () => {
    const rule = mockRule('id');
    const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
    wrapper.update();
    expect(
      wrapper.find('[data-test-subj="rules-details-generic-downloader"]').prop('ids')
    ).toEqual([rule.rule_id]);
  });
});
