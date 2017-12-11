import React from 'react';
import { render, shallow, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { KuiContextMenuItem } from './context_menu_item';

describe('KuiContextMenuItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenuItem {...requiredProps}>
        Hello
      </KuiContextMenuItem>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('icon', () => {
      test('is rendered', () => {
        const component = render(
          <KuiContextMenuItem icon={<span className="kuiIcon fa-user" />} />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('disabled', () => {
      test('is rendered', () => {
        const component = render(
          <KuiContextMenuItem disabled />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(
          <KuiContextMenuItem onClick={onClickHandler} />
        );

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the item is clicked', () => {
        const onClickHandler = sinon.stub();

        const component = shallow(
          <KuiContextMenuItem onClick={onClickHandler} />
        );

        component.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });

      test('is not called when the item is clicked but set to disabled', () => {
        const onClickHandler = sinon.stub();

        const component = mount(
          <KuiContextMenuItem disabled onClick={onClickHandler} />
        );

        component.simulate('click');

        sinon.assert.notCalled(onClickHandler);
      });
    });

    describe('hasPanel', () => {
      test('is rendered', () => {
        const component = render(
          <KuiContextMenuItem hasPanel />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
