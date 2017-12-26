import React from 'react';
import { render, shallow, mount } from 'enzyme';
import { requiredProps, findTestSubject } from '../../../test';
import sinon from 'sinon';

import {
  KuiTextInput,
  TEXTINPUT_SIZE
} from './text_input';

describe('KuiTextInput', () => {
  test('renders', () => {
    const component = (
      <KuiTextInput
        value="text input"
        onChange={()=>{}}
        {...requiredProps}
      />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('placeholder', () => {
      const component = (
        <KuiTextInput
          placeholder="placeholder"
          onChange={()=>{}}
        />
      );

      expect(render(component)).toMatchSnapshot();
    });

    test('value', () => {
      const component = (
        <KuiTextInput
          value="value"
          onChange={()=>{}}
        />
      );

      expect(render(component)).toMatchSnapshot();
    });

    describe('autoFocus', () => {
      test('sets focus on the element', () => {
        const component = mount(
          <KuiTextInput
            autoFocus
            onChange={()=>{}}
            data-test-subj="input"
          />
        );

        expect(
          findTestSubject(component, 'input').getDOMNode()
        ).toBe(document.activeElement);
      });

      test('does not focus the element by default', () => {
        const component = mount(
          <KuiTextInput
            onChange={()=>{}}
            data-test-subj="input"
          />
        );

        expect(
          findTestSubject(component, 'input').getDOMNode()
        ).not.toBe(document.activeElement);
      });
    });

    describe('isInvalid', () => {
      test('true renders invalid', () => {
        const component = (
          <KuiTextInput
            isInvalid
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders valid', () => {
        const component = (
          <KuiTextInput
            isInvalid={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = (
          <KuiTextInput
            isDisabled
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = (
          <KuiTextInput
            isDisabled={false}
            onChange={()=>{}}
          />
        );

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('size', () => {
      TEXTINPUT_SIZE.forEach(size=>{
        test(`renders ${size}`, () => {
          const component = (
            <KuiTextInput
              size={size}
              onChange={()=>{}}
            />
          );

          expect(render(component)).toMatchSnapshot();
        });
      });
    });

    describe('onChange', () => {
      test(`is called when input is changed`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(
          <KuiTextInput
            onChange={onChangeHandler}
          />
        );

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
