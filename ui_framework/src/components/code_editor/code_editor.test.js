import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { KuiCodeEditor } from './code_editor';
import { keyCodes } from '../../services';
import { requiredProps } from '../../test/required_props';

// Mock the htmlIdGenerator to generate predictable ids for snapshot tests
jest.mock('../../services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => { return () => 42; },
}));

describe('KuiCodeEditor', () => {

  let element;

  beforeEach(() => {
    element = mount(<KuiCodeEditor/>);
  });

  test('is rendered', () => {
    const component = <KuiCodeEditor {...requiredProps}/>;
    expect(mount(component).html()).toMatchSnapshot();
  });

  describe('hint element', () => {

    test('should exist', () => {
      expect(element.find('.kuiCodeEditorKeyboardHint').exists()).toBe(true);
    });

    test('should be tabable', () => {
      expect(element.find('.kuiCodeEditorKeyboardHint').prop('tabIndex')).toBe('0');
    });

    test('should vanish when hit enter on it', () => {
      const hint = element.find('.kuiCodeEditorKeyboardHint');
      hint.simulate('keydown', { keyCode: keyCodes.ENTER });
      expect(hint.hasClass('kuiCodeEditorKeyboardHint-isInactive')).toBe(true);
    });

    test('should be enabled after bluring the ui ace box', () => {
      const hint = element.find('.kuiCodeEditorKeyboardHint');
      hint.simulate('keydown', { keyCode: keyCodes.ENTER });
      expect(hint.hasClass('kuiCodeEditorKeyboardHint-isInactive')).toBe(true);
      element.instance().onBlurAce();
      expect(hint.hasClass('kuiCodeEditorKeyboardHint-isInactive')).toBe(false);
    });

  });

  describe('interaction', () => {

    test('bluring the ace textbox should call a passed onBlur prop', () => {
      const blurSpy = sinon.spy();
      const el = mount(<KuiCodeEditor onBlur={blurSpy}/>);
      el.instance().onBlurAce();
      expect(blurSpy.called).toBe(true);
    });

    test('pressing escape in ace textbox will enable overlay', () => {
      element.instance().onKeydownAce({
        preventDefault: () => {},
        stopPropagation: () => {},
        keyCode: keyCodes.ESCAPE
      });
      expect(element.find('.kuiCodeEditorKeyboardHint').matchesElement(document.activeElement)).toBe(true);
    });

  });

});
