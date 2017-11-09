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
  test('is rendered', () => {
    const component = mount(<KuiCodeEditor {...requiredProps} />);
    expect(takeMountedSnapshot(component)).toMatchSnapshot();
  });

  describe('props', () => {
    describe('isReadOnly', () => {
      test(`renders alternate hint text`, () => {
        const component = mount(<KuiCodeEditor isReadOnly />);
        expect(takeMountedSnapshot(component)).toMatchSnapshot();
      });
    });
  });

  describe('behavior', () => {
    let component;

    beforeEach(() => {
      component = mount(<KuiCodeEditor/>);
    });

    describe('hint element', () => {
      test('should be tabable', () => {
        expect(component.find('[data-test-subj="codeEditorHint"]').prop('tabIndex')).toBe('0');
      });

      test('should be disabled when the ui ace box gains focus', () => {
        const hint = component.find('[data-test-subj="codeEditorHint"]');
        hint.simulate('keydown', { keyCode: keyCodes.ENTER });
        expect(hint).toMatchSnapshot();
      });

      test('should be enabled when the ui ace box loses focus', () => {
        const hint = component.find('[data-test-subj="codeEditorHint"]');
        hint.simulate('keydown', { keyCode: keyCodes.ENTER });
        component.instance().onBlurAce();
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
        component.instance().onKeydownAce({
          preventDefault: () => {},
          stopPropagation: () => {},
          keyCode: keyCodes.ESCAPE
        });
        expect(
          component.find('[data-test-subj="codeEditorHint"]').matchesElement(document.activeElement)
        ).toBe(true);
      });
    });
  });
});
