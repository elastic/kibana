import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../test/required_props';
import sinon from 'sinon';

import {
  KuiExpressionItemButton,
} from './expression_item_button';

describe('KuiExpressionItemButton', () => {
  test('renders', () => {
    const component = (
      <KuiExpressionItemButton
        description="the answer is"
        buttonValue="42"
        isActive={false}
        onClick={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('isActive', () => {
      test('true renders active', () => {
        const component = (
          <KuiExpressionItemButton
            description="the answer is"
            buttonValue="42"
            isActive={true}
            onClick={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders inactive', () => {
        const component = (
          <KuiExpressionItemButton
            description="the answer is"
            buttonValue="42"
            isActive={false}
            onClick={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.spy();

        const button = shallow(
          <KuiExpressionItemButton
            description="the answer is"
            buttonValue="42"
            isActive={false}
            onClick={onClickHandler}
            {...requiredProps}
          />
        );

        button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });
  });
});
