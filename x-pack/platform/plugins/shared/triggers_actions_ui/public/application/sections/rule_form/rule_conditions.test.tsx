/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { RuleConditions, ActionGroupWithCondition } from './rule_conditions';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
} from '@elastic/eui';

describe('rule_conditions', () => {
  async function setup(element: React.ReactElement): Promise<ReactWrapper<unknown>> {
    const wrapper = mountWithIntl(element);

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  it('renders with custom headline', async () => {
    const wrapper = await setup(
      <RuleConditions
        headline={'Set different threshold with their own status'}
        actionGroups={[]}
      />
    );

    expect(wrapper.find(EuiTitle).find(FormattedMessage).prop('id')).toMatchInlineSnapshot(
      `"xpack.triggersActionsUI.sections.ruleForm.conditions.title"`
    );
    expect(
      wrapper.find(EuiTitle).find(FormattedMessage).prop('defaultMessage')
    ).toMatchInlineSnapshot(`"Conditions:"`);

    expect(wrapper.find('[data-test-subj="ruleConditionsHeadline"]').get(0)).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        data-test-subj="ruleConditionsHeadline"
        size="s"
      >
        Set different threshold with their own status
      </EuiText>
    `);
  });

  it('renders any action group with conditions on it', async () => {
    const ConditionForm = ({
      actionGroup,
    }: {
      actionGroup?: ActionGroupWithCondition<{ someProp: string }, string>;
    }) => {
      return (
        <EuiDescriptionList>
          <EuiDescriptionListTitle>ID</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.id}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Name</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.name}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>SomeProp</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {actionGroup?.conditions?.someProp}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      );
    };

    const wrapper = await setup(
      <RuleConditions
        actionGroups={[
          { id: 'default', name: 'Default', conditions: { someProp: 'my prop value' } },
        ]}
      >
        <ConditionForm />
      </RuleConditions>
    );

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).get(0))
      .toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        default
      </EuiDescriptionListDescription>
    `);

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).get(1))
      .toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        Default
      </EuiDescriptionListDescription>
    `);

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).get(2))
      .toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        my prop value
      </EuiDescriptionListDescription>
    `);
  });

  it('doesnt render action group without conditions', async () => {
    const ConditionForm = ({
      actionGroup,
    }: {
      actionGroup?: ActionGroupWithCondition<{ someProp: string }, string>;
    }) => {
      return (
        <EuiDescriptionList>
          <EuiDescriptionListTitle>ID</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.id}</EuiDescriptionListDescription>
        </EuiDescriptionList>
      );
    };

    const wrapper = await setup(
      <RuleConditions
        actionGroups={[
          { id: 'default', name: 'Default', conditions: { someProp: 'default on a prop' } },
          {
            id: 'shouldRender',
            name: 'Should Render',
            conditions: { someProp: 'shouldRender on a prop' },
          },
          {
            id: 'shouldntRender',
            name: 'Should Not Render',
          },
        ]}
      >
        <ConditionForm />
      </RuleConditions>
    );

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).get(0))
      .toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        default
      </EuiDescriptionListDescription>
    `);

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).get(1))
      .toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        shouldRender
      </EuiDescriptionListDescription>
    `);

    expect(wrapper.find(EuiDescriptionList).find(EuiDescriptionListDescription).length).toEqual(2);
  });

  it('render add buttons for action group without conditions', async () => {
    const onInitializeConditionsFor = jest.fn();

    const ConditionForm = ({
      actionGroup,
    }: {
      actionGroup?: ActionGroupWithCondition<{ someProp: string }, string>;
    }) => {
      return (
        <EuiDescriptionList>
          <EuiDescriptionListTitle>ID</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.id}</EuiDescriptionListDescription>
        </EuiDescriptionList>
      );
    };

    const wrapper = await setup(
      <RuleConditions
        actionGroups={[
          {
            id: 'shouldntRenderLink',
            name: 'Should Not Render Link',
            conditions: { someProp: 'shouldRender on a prop' },
          },
          {
            id: 'shouldRenderLink',
            name: 'Should Render A Link',
          },
        ]}
        onInitializeConditionsFor={onInitializeConditionsFor}
      >
        <ConditionForm />
      </RuleConditions>
    );

    expect(wrapper.find(EuiButtonEmpty).get(0)).toMatchInlineSnapshot(`
      <EuiButtonEmpty
        flush="left"
        onClick={[Function]}
        size="s"
      >
        Should Render A Link
      </EuiButtonEmpty>
    `);
    wrapper.find(EuiButtonEmpty).simulate('click');

    expect(onInitializeConditionsFor).toHaveBeenCalledWith({
      id: 'shouldRenderLink',
      name: 'Should Render A Link',
    });
  });

  it('passes in any additional props the container passes in', async () => {
    const callbackProp = jest.fn();

    const ConditionForm = ({
      actionGroup,
      someCallbackProp,
    }: {
      actionGroup?: ActionGroupWithCondition<{ someProp: string }, string>;
      someCallbackProp: (
        actionGroup: ActionGroupWithCondition<{ someProp: string }, string>
      ) => void;
    }) => {
      if (!actionGroup) {
        return <div />;
      }

      // call callback when the actionGroup is available
      someCallbackProp(actionGroup);
      return (
        <EuiDescriptionList>
          <EuiDescriptionListTitle>ID</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.id}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Name</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{actionGroup?.name}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>SomeProp</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {actionGroup?.conditions?.someProp}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      );
    };

    await setup(
      <RuleConditions
        actionGroups={[
          { id: 'default', name: 'Default', conditions: { someProp: 'my prop value' } },
        ]}
      >
        <ConditionForm someCallbackProp={callbackProp} />
      </RuleConditions>
    );

    expect(callbackProp).toHaveBeenCalledWith({
      id: 'default',
      name: 'Default',
      conditions: { someProp: 'my prop value' },
    });
  });
});
