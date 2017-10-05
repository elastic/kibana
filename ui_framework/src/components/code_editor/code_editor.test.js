import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { KuiCodeEditor } from './code_editor';
import { keyCodes } from '../../services';
import {
  requiredProps,
  takeMountedSnapshot,
} from '../../test';

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
    const component = mount(<KuiCodeEditor {...requiredProps}/>);
    expect(takeMountedSnapshot(component)).toMatchSnapshot();
  });

  describe('hint element', () => {
    test('should be tabable', () => {
      expect(element.find('[data-test-subj="codeEditorHint"]').prop('tabIndex')).toBe('0');
    });

    test('should be disabled when the ui ace box gains focus', () => {
      const hint = element.find('[data-test-subj="codeEditorHint"]');
      hint.simulate('keydown', { keyCode: keyCodes.ENTER });
      expect(hint).toMatchSnapshot();
    });

    test('should be enabled when the ui ace box loses focus', () => {
      const hint = element.find('[data-test-subj="codeEditorHint"]');
      hint.simulate('keydown', { keyCode: keyCodes.ENTER });
      element.instance().onBlurAce();
      expect(hint).toMatchSnapshot();
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
      expect(
        element.find('[data-test-subj="codeEditorHint"]').matchesElement(document.activeElement)
      ).toBe(true);
    });
  });
});
