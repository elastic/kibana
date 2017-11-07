import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../../test/required_props';
import sinon from 'sinon';

import {
  KuiCheckBox,
} from './check_box';

describe('KuiCheckBox', () => {
  test('renders', () => {
    const component = (
      <KuiCheckBox
        onChange={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('isChecked', () => {
      test('true renders checked', () => {
        const component = (
          <KuiCheckBox
            isChecked
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders unchecked', () => {
        const component = (
          <KuiCheckBox
            isChecked={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = (
          <KuiCheckBox
            isDisabled
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = (
          <KuiCheckBox
            isDisabled={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('onChange', () => {
      test(`is called when checkbox is changed`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(
          <KuiCheckBox
            onChange={onChangeHandler}
          />
        );

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
