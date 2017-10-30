import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../../test/required_props';
import sinon from 'sinon';

import {
  KuiCheckBoxLabel,
} from './check_box_label';

describe('KuiCheckBoxLabel', () => {
  test('renders', () => {
    const component = (
      <KuiCheckBoxLabel
        onChange={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('text', () => {
      const component = (
        <KuiCheckBoxLabel
          text="text"
          onChange={()=>{}}
        />
      );

      expect(render(component)).toMatchSnapshot();
    });

    describe('isChecked', () => {
      test('true renders checked', () => {
        const component = (
          <KuiCheckBoxLabel
            isChecked
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders unchecked', () => {
        const component = (
          <KuiCheckBoxLabel
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
          <KuiCheckBoxLabel
            isDisabled
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = (
          <KuiCheckBoxLabel
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
          <KuiCheckBoxLabel
            onChange={onChangeHandler}
          />
        );

        wrapper.find('KuiCheckBox').simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
