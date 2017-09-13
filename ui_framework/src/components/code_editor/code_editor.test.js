import React from 'react';
import { mount } from 'enzyme';
import { KuiCodeEditor } from './code_editor';

describe('KuiCodeEditor', () => {

  let element;

  beforeEach(() => {
    element = mount(<KuiCodeEditor/>);
  });

  test('should have the hint element', () => {
    expect(element.find('.kuiCodeEditorKeyboardHint').exists()).toBe(true);
  });

  describe('hint element', () => {
    test('should be tabable', () => {
      expect(element.find('.kuiCodeEditorKeyboardHint').prop('tabIndex')).toBe('0');
    });

    // test('should move focus to textbox and be inactive if pressed enter on it', () => {
    //   const textarea = element.find('textarea');
    //   sinon.spy(textarea[0], 'focus');
    //   const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
    //   ev.keyCode = keyCodes.ENTER;
    //   element.find('.uiAceKeyboardHint').trigger(ev);
    //   expect(textarea[0].focus.called).to.be(true);
    //   expect(element.find('.uiAceKeyboardHint').hasClass('uiAceKeyboardHint-isInactive')).to.be(true);
    // });
//
//     it('should be shown again, when pressing Escape in ace editor', () => {
//       const textarea = element.find('textarea');
//       const hint = element.find('.uiAceKeyboardHint');
//       sinon.spy(hint[0], 'focus');
//       const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
//       ev.keyCode = keyCodes.ESCAPE;
//       textarea.trigger(ev);
//       expect(hint[0].focus.called).to.be(true);
//       expect(hint.hasClass('uiAceKeyboardHint-isInactive')).to.be(false);
//     });
  });
//
  // describe('ui-ace textarea', () => {
  //   test('should not be tabable anymore', () => {
  //     console.log(element.debug());
  //     expect(element.find('textarea').prop('tabIndex')).toBe('-1');
  //   });
  // });
//
// });
//
//   describe('hint element', () => {
//     it('should be tabable', () => {
//       expect(element.find('.uiAceKeyboardHint').attr('tabindex')).to.be('0');
//     });
//
//     it('should move focus to textbox and be inactive if pressed enter on it', () => {
//       const textarea = element.find('textarea');
//       sinon.spy(textarea[0], 'focus');
//       const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
//       ev.keyCode = keyCodes.ENTER;
//       element.find('.uiAceKeyboardHint').trigger(ev);
//       expect(textarea[0].focus.called).to.be(true);
//       expect(element.find('.uiAceKeyboardHint').hasClass('uiAceKeyboardHint-isInactive')).to.be(true);
//     });
//
//     it('should be shown again, when pressing Escape in ace editor', () => {
//       const textarea = element.find('textarea');
//       const hint = element.find('.uiAceKeyboardHint');
//       sinon.spy(hint[0], 'focus');
//       const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
//       ev.keyCode = keyCodes.ESCAPE;
//       textarea.trigger(ev);
//       expect(hint[0].focus.called).to.be(true);
//       expect(hint.hasClass('uiAceKeyboardHint-isInactive')).to.be(false);
//     });
//   });
//
//   describe('ui-ace textarea', () => {
//     it('should not be tabable anymore', () => {
//       expect(element.find('textarea').attr('tabindex')).to.be('-1');
//     });
  // });

});
