import React from 'react';
import { render, shallow } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderSectionItemButton } from './header_section_item_button';

describe('KuiHeaderSectionItemButton', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderSectionItemButton {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('onClick', () => {
    test(`isn't called upon instantiation`, () => {
      const onClickHandler = sinon.stub();

      shallow(
        <KuiHeaderSectionItemButton onClick={onClickHandler} />
      );

      sinon.assert.notCalled(onClickHandler);
    });

    test('is called when the button is clicked', () => {
      const onClickHandler = sinon.stub();

      const $button = shallow(
        <KuiHeaderSectionItemButton onClick={onClickHandler} />
      );

      $button.simulate('click');

      sinon.assert.calledOnce(onClickHandler);
    });
  });
});
