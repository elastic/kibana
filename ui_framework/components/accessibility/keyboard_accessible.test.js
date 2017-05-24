import React from 'react';
import {
  render,
  shallow,
} from 'enzyme';
import sinon from 'sinon';

import { KuiKeyboardAccessible } from './keyboard_accessible';

import {
  ENTER_KEY,
  SPACE_KEY,
} from '../../services';

describe('KuiKeyboardAccessible', () => {
  describe('throws an error', () => {
    let consoleStub;

    beforeEach(() => {
      consoleStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    test(`when there's no child`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible />
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `needs to wrap an element with which the user interacts.`
      );
    });

    test('when the child is a button', () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <button onClick={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `doesn't need to be used on a button.`
      );
    });

    test('when the child is a link with an href', () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <a href="#" onClick={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `doesn't need to be used on a link if it has a href attribute.`
      );
    });

    test(`when the child doesn't have an onClick prop`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <div />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `needs to wrap an element which has an onClick prop assigned.`
      );
    });

    test(`when the child's onClick prop isn't a function`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <div onClick="notAFunction" />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `child's onClick prop needs to be a function.`
      );
    });

    test(`when the child has an onKeyDown prop`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <div onClick={() => {}} onKeyDown={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `child can't have an onKeyDown prop because the implementation will override it.`
      );
    });

    test(`when the child has an onKeyUp prop`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <div onClick={() => {}} onKeyUp={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `child can't have an onKeyUp prop because the implementation will override it.`
      );
    });
  });

  describe(`doesn't throw an error`, () => {
    test('when the element is a link without an href', () => {
      const consoleStub = sinon.stub(console, 'error');
      const component = ( // eslint-disable-line no-unused-vars
        <KuiKeyboardAccessible>
          <a onClick={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect(consoleStub.called).toBe(false);
      console.error.restore();
    });
  });

  describe('adds accessibility attributes', () => {
    test('tabindex and role', () => {
      const $button = render(
        <KuiKeyboardAccessible>
          <div onClick={() => {}} />
        </KuiKeyboardAccessible>
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe(`doesn't override pre-existing accessibility attributes`, () => {
    test('tabindex', () => {
      const $button = render(
        <KuiKeyboardAccessible>
          <div onClick={() => {}} tabIndex="1" />
        </KuiKeyboardAccessible>
      );

      expect($button)
        .toMatchSnapshot();
    });

    test('role', () => {
      const $button = render(
        <KuiKeyboardAccessible>
          <div onClick={() => {}} role="submit" />
        </KuiKeyboardAccessible>
      );

      expect($button)
        .toMatchSnapshot();
    });
  });

  describe(`calls onClick`, () => {
    test(`on ENTER keyup`, () => {
      const onClickHandler = sinon.stub();

      const $button = shallow(
        <KuiKeyboardAccessible>
          <div data-div onClick={onClickHandler} />
        </KuiKeyboardAccessible>
      );

      $button.find('[data-div]').simulate('keyup', {
        keyCode: ENTER_KEY
      });

      sinon.assert.calledOnce(onClickHandler);
    });

    test(`on SPACE keyup`, () => {
      const onClickHandler = sinon.stub();

      const $button = shallow(
        <KuiKeyboardAccessible>
          <div data-div onClick={onClickHandler} />
        </KuiKeyboardAccessible>
      );

      $button.find('[data-div]').simulate('keyup', {
        keyCode: SPACE_KEY
      });

      sinon.assert.calledOnce(onClickHandler);
    });
  });
});
