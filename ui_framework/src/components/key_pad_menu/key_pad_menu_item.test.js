import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import {
  KuiKeyPadMenuItem,
  KuiKeyPadMenuItemButton,
} from './key_pad_menu_item';

describe('KuiKeyPadMenuItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiKeyPadMenuItem label="Label" {...requiredProps}>
        Icon
      </KuiKeyPadMenuItem>
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('renders href', () => {
    const component = render(
      <KuiKeyPadMenuItem label="Label" href="#">
        Icon
      </KuiKeyPadMenuItem>
    );

    expect(component)
      .toMatchSnapshot();
  });
});

describe('KuiKeyPadMenuItemButton', () => {
  test('is rendered', () => {
    const component = render(
      <KuiKeyPadMenuItemButton label="Label" {...requiredProps}>
        Icon
      </KuiKeyPadMenuItemButton>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('onClick', () => {
    test(`isn't called upon instantiation`, () => {
      const onClickHandler = sinon.stub();

      shallow(
        <KuiKeyPadMenuItemButton label="Label" onClick={onClickHandler}>
          Icon
        </KuiKeyPadMenuItemButton>
      );

      sinon.assert.notCalled(onClickHandler);
    });

    test('is called when the button is clicked', () => {
      const onClickHandler = sinon.stub();

      const $button = shallow(
        <KuiKeyPadMenuItemButton label="Label" onClick={onClickHandler}>
          Icon
        </KuiKeyPadMenuItemButton>
      );

      $button.simulate('click');

      sinon.assert.calledOnce(onClickHandler);
    });
  });
});
