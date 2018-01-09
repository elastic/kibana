import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { findTestSubject, requiredProps } from '../../test';

import {
  KuiContextMenuPanel,
} from './context_menu_panel';

import {
  KuiContextMenuItem,
} from './context_menu_item';

import { keyCodes } from '../../services';

const items = [
  (
    <KuiContextMenuItem
      key="A"
      data-test-subj="itemA"
    >
      Option A
    </KuiContextMenuItem>
  ), (
    <KuiContextMenuItem
      key="B"
      data-test-subj="itemB"
    >
      Option B
    </KuiContextMenuItem>
  ), (
    <KuiContextMenuItem
      key="C"
      data-test-subj="itemC"
    >
      Option C
    </KuiContextMenuItem>
  )
];

describe('KuiContextMenuPanel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenuPanel {...requiredProps}>
        Hello
      </KuiContextMenuPanel>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('title', () => {
      test('is rendered', () => {
        const component = render(
          <KuiContextMenuPanel title="Title" />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('onClose', () => {
      test('renders a button as a title', () => {
        const component = render(
          <KuiContextMenuPanel title="Title" onClose={() =>{}} />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test(`isn't called upon instantiation`, () => {
        const onCloseHandler = sinon.stub();

        mount(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        sinon.assert.notCalled(onCloseHandler);
      });

      test('is called when the title is clicked', () => {
        const onCloseHandler = sinon.stub();

        const component = mount(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        component.find('button').simulate('click');

        sinon.assert.calledOnce(onCloseHandler);
      });
    });

    describe('onHeightChange', () => {
      it('is called with a height value', () => {
        const onHeightChange = sinon.stub();

        mount(
          <KuiContextMenuPanel onHeightChange={onHeightChange} />
        );

        sinon.assert.calledWith(onHeightChange, 0);
      });
    });

    describe('transitionDirection', () => {
      describe('next', () => {
        describe('with transitionType', () => {
          describe('in', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="next" transitionType="in" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });

          describe('out', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="next" transitionType="out" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });
        });
      });

      describe('previous', () => {
        describe('with transitionType', () => {
          describe('in', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="previous" transitionType="in" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });

          describe('out', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="previous" transitionType="out" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });
        });
      });
    });

    describe('initialFocusedItemIndex', () => {
      it('sets focus on the item occupying that index', () => {
        const component = mount(
          <KuiContextMenuPanel
            items={items}
            initialFocusedItemIndex={1}
          />
        );

        expect(findTestSubject(component, 'itemB').getDOMNode()).toBe(document.activeElement);
      });
    });

    describe('onUseKeyboardToNavigate', () => {
      it('is called when up arrow is pressed', () => {
        const onUseKeyboardToNavigateHandler = sinon.stub();

        const component = mount(
          <KuiContextMenuPanel
            items={items}
            onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.UP });
        sinon.assert.calledOnce(onUseKeyboardToNavigateHandler);
      });

      it('is called when down arrow is pressed', () => {
        const onUseKeyboardToNavigateHandler = sinon.stub();

        const component = mount(
          <KuiContextMenuPanel
            items={items}
            onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.UP });
        sinon.assert.calledOnce(onUseKeyboardToNavigateHandler);
      });

      describe('left arrow', () => {
        it('calls handler if showPreviousPanel exists', () => {
          const onUseKeyboardToNavigateHandler = sinon.stub();

          const component = mount(
            <KuiContextMenuPanel
              items={items}
              showPreviousPanel={() => {}}
              onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
            />
          );

          component.simulate('keydown', { keyCode: keyCodes.LEFT });
          sinon.assert.calledOnce(onUseKeyboardToNavigateHandler);
        });

        it(`doesn't call handler if showPreviousPanel doesn't exist`, () => {
          const onUseKeyboardToNavigateHandler = sinon.stub();

          const component = mount(
            <KuiContextMenuPanel
              items={items}
              onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
            />
          );

          component.simulate('keydown', { keyCode: keyCodes.LEFT });
          sinon.assert.notCalled(onUseKeyboardToNavigateHandler);
        });
      });

      describe('right arrow', () => {
        it('calls handler if showNextPanel exists', () => {
          const onUseKeyboardToNavigateHandler = sinon.stub();

          const component = mount(
            <KuiContextMenuPanel
              items={items}
              showNextPanel={() => {}}
              onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
            />
          );

          component.simulate('keydown', { keyCode: keyCodes.RIGHT });
          sinon.assert.calledOnce(onUseKeyboardToNavigateHandler);
        });

        it(`doesn't call handler if showNextPanel doesn't exist`, () => {
          const onUseKeyboardToNavigateHandler = sinon.stub();

          const component = mount(
            <KuiContextMenuPanel
              items={items}
              onUseKeyboardToNavigate={onUseKeyboardToNavigateHandler}
            />
          );

          component.simulate('keydown', { keyCode: keyCodes.RIGHT });
          sinon.assert.notCalled(onUseKeyboardToNavigateHandler);
        });
      });
    });
  });

  describe('behavior', () => {
    describe('focus', () => {
      it('is set on the first focusable element by default if there are no items and hasFocus is true', () => {
        const component = mount(
          <KuiContextMenuPanel>
            <button data-test-subj="button" />
          </KuiContextMenuPanel>
        );

        expect(findTestSubject(component, 'button').getDOMNode()).toBe(document.activeElement);
      });

      it('is not set on anything if hasFocus is false', () => {
        const component = mount(
          <KuiContextMenuPanel hasFocus={false}>
            <button data-test-subj="button" />
          </KuiContextMenuPanel>
        );

        expect(findTestSubject(component, 'button').getDOMNode()).not.toBe(document.activeElement);
      });
    });

    describe('keyboard navigation of items', () => {
      let component;
      let showNextPanelHandler;
      let showPreviousPanelHandler;

      beforeEach(() => {
        showNextPanelHandler = sinon.stub();
        showPreviousPanelHandler = sinon.stub();

        component = mount(
          <KuiContextMenuPanel
            items={items}
            showNextPanel={showNextPanelHandler}
            showPreviousPanel={showPreviousPanelHandler}
          />
        );
      });

      it(`focuses the panel by default`, () => {
        expect(component.getDOMNode()).toBe(document.activeElement);
      });

      it('down arrow key focuses the first menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.DOWN });

        expect(findTestSubject(component, 'itemA').getDOMNode()).toBe(document.activeElement);
      });

      it('subsequently, down arrow key focuses the next menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.DOWN });
        component.simulate('keydown', { keyCode: keyCodes.DOWN });

        expect(findTestSubject(component, 'itemB').getDOMNode()).toBe(document.activeElement);
      });

      it('down arrow key wraps to first menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.UP });
        component.simulate('keydown', { keyCode: keyCodes.DOWN });

        expect(findTestSubject(component, 'itemA').getDOMNode()).toBe(document.activeElement);
      });

      it('up arrow key focuses the last menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.UP });

        expect(findTestSubject(component, 'itemC').getDOMNode()).toBe(document.activeElement);
      });

      it('subsequently, up arrow key focuses the previous menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.UP });
        component.simulate('keydown', { keyCode: keyCodes.UP });

        expect(findTestSubject(component, 'itemB').getDOMNode()).toBe(document.activeElement);
      });

      it('up arrow key wraps to last menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.DOWN });
        component.simulate('keydown', { keyCode: keyCodes.UP });

        expect(findTestSubject(component, 'itemC').getDOMNode()).toBe(document.activeElement);
      });

      it(`right arrow key shows next panel with focused item's index`, () => {
        component.simulate('keydown', { keyCode: keyCodes.DOWN });
        component.simulate('keydown', { keyCode: keyCodes.RIGHT });
        sinon.assert.calledWith(showNextPanelHandler, 0);
      });

      it('left arrow key shows previous panel', () => {
        component.simulate('keydown', { keyCode: keyCodes.LEFT });
        sinon.assert.calledOnce(showPreviousPanelHandler);
      });
    });
  });
});
