import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../../test/required_props';
import sinon from 'sinon';

import {
  KuiTextArea,
  TEXTAREA_SIZE
} from './text_area';

describe('KuiTextArea', () => {
  test('renders', () => {
    const component = (
      <KuiTextArea
        value="text area"
        onChange={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('placeholder', () => {
      const component = (
        <KuiTextArea
          placeholder="placeholder"
          onChange={()=>{}}
        />
      );

      expect(render(component)).toMatchSnapshot();
    });

    test('value', () => {
      const component = (
        <KuiTextArea
          value="value"
          onChange={()=>{}}
        />
      );

      expect(render(component)).toMatchSnapshot();
    });

    describe('isInvalid', () => {
      test('true renders invalid', () => {
        const component = (
          <KuiTextArea
            isInvalid
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders valid', () => {
        const component = (
          <KuiTextArea
            isInvalid={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isNonResizable', () => {
      test('true renders non-resizable', () => {
        const component = (
          <KuiTextArea
            isNonResizable
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders resizable', () => {
        const component = (
          <KuiTextArea
            isNonResizable={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = (
          <KuiTextArea
            isDisabled
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = (
          <KuiTextArea
            isDisabled={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('size', () => {
      TEXTAREA_SIZE.forEach(size=>{
        test(`renders ${size}`, () => {
          const component = (
            <KuiTextArea
              size={size}
              onChange={()=>{}}
            />
          );

          expect(render(component)).toMatchSnapshot();
        });
      });
    });

    describe('onChange', () => {
      test(`is called when textarea is written`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(
          <KuiTextArea
            onChange={onChangeHandler}
          />
        );

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
