/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock/test_providers';

import {
  addGlobalResizeCursorStyleToBody,
  globalResizeCursorClassName,
  removeGlobalResizeCursorStyleFromBody,
  Resizeable,
  calculateDeltaX,
} from '.';
import { CommonResizeHandle } from './styled_handles';

describe('Resizeable', () => {
  afterEach(() => {
    document.body.classList.remove(globalResizeCursorClassName);
  });

  test('it applies the provided height to the ResizeHandleContainer when a height is specified', () => {
    const wrapper = mount(
      <TestProviders>
        <Resizeable
          handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
          height="100%"
          id="test"
          render={() => <></>}
          onResize={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="resize-handle-container"]').first()).toHaveStyleRule(
      'height',
      '100%'
    );
  });

  test('it applies positioning styles to the ResizeHandleContainer when positionAbsolute is true and bottom/left/right/top is specified', () => {
    const wrapper = mount(
      <TestProviders>
        <Resizeable
          bottom={0}
          handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
          id="test"
          left={0}
          render={() => <></>}
          right={0}
          top={0}
          positionAbsolute
          onResize={jest.fn()}
        />
      </TestProviders>
    );
    const resizeHandleContainer = wrapper
      .find('[data-test-subj="resize-handle-container"]')
      .first();

    expect(resizeHandleContainer).toHaveStyleRule('bottom', '0');
    expect(resizeHandleContainer).toHaveStyleRule('left', '0');
    expect(resizeHandleContainer).toHaveStyleRule('position', 'absolute');
    expect(resizeHandleContainer).toHaveStyleRule('right', '0');
    expect(resizeHandleContainer).toHaveStyleRule('top', '0');
  });

  test('it DOES NOT apply positioning styles to the ResizeHandleContainer when positionAbsolute is false, regardless if bottom/left/right/top is specified', () => {
    const wrapper = mount(
      <TestProviders>
        <Resizeable
          bottom={0}
          handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
          id="test"
          left={0}
          render={() => <></>}
          right={0}
          top={0}
          onResize={jest.fn()}
        />
      </TestProviders>
    );
    const resizeHandleContainer = wrapper
      .find('[data-test-subj="resize-handle-container"]')
      .first();

    expect(resizeHandleContainer).not.toHaveStyleRule('bottom', '0');
    expect(resizeHandleContainer).not.toHaveStyleRule('left', '0');
    expect(resizeHandleContainer).not.toHaveStyleRule('position', 'absolute');
    expect(resizeHandleContainer).not.toHaveStyleRule('right', '0');
    expect(resizeHandleContainer).not.toHaveStyleRule('top', '0');
  });

  test('it renders', () => {
    const wrapper = shallow(
      <Resizeable
        handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
        height="100%"
        id="test"
        render={() => <></>}
        onResize={jest.fn()}
      />
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('resize cursor styling', () => {
    test('it does NOT apply the global-resize-cursor style to the body by default', () => {
      mount(
        <TestProviders>
          <Resizeable
            handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
            height="100%"
            id="test"
            render={() => <></>}
            onResize={jest.fn()}
          />
        </TestProviders>
      );

      expect(document.body.className).not.toContain(globalResizeCursorClassName);
    });

    describe('#addGlobalResizeCursorStyleToBody', () => {
      test('it adds the global-resize-cursor style to the body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              render={() => <></>}
              onResize={jest.fn()}
            />
          </TestProviders>
        );

        addGlobalResizeCursorStyleToBody();

        expect(document.body.className).toContain(globalResizeCursorClassName);
      });
    });

    describe('#removeGlobalResizeCursorStyleFromBody', () => {
      test('it removes the global-resize-cursor style from body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CommonResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              render={() => <></>}
              onResize={jest.fn()}
            />
          </TestProviders>
        );

        addGlobalResizeCursorStyleToBody();
        removeGlobalResizeCursorStyleFromBody();

        expect(document.body.className).not.toContain(globalResizeCursorClassName);
      });
    });

    describe('#calculateDeltaX', () => {
      test('it returns 0 when prevX isEqual 0', () => {
        expect(calculateDeltaX({ prevX: 0, screenX: 189 })).toEqual(0);
      });

      test('it returns positive difference when screenX > prevX', () => {
        expect(calculateDeltaX({ prevX: 10, screenX: 189 })).toEqual(179);
      });

      test('it returns negative difference when prevX > screenX ', () => {
        expect(calculateDeltaX({ prevX: 199, screenX: 189 })).toEqual(-10);
      });
    });
  });
});
