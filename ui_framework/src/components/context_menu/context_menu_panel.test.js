import React from 'react';
import { render, shallow, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import {
  KuiContextMenuPanel,
} from './context_menu_panel';

import {
  KuiContextMenuItem,
} from './context_menu_item';

import { keyCodes } from '../../services';

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

        shallow(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        sinon.assert.notCalled(onCloseHandler);
      });

      test('is called when the title is clicked', () => {
        const onCloseHandler = sinon.stub();

        const component = shallow(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        component.find('button').simulate('click');

        sinon.assert.calledOnce(onCloseHandler);
      });
    });

    describe('panelRef', () => {
      it('is provided a node', () => {
        const panelRef = sinon.stub();

        mount(
          <KuiContextMenuPanel panelRef={panelRef} />
        );

        sinon.assert.calledWith(panelRef, sinon.match.object);
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
  });

  describe('behavior', () => {
    describe('focus', () => {
      it('is set on the first focusable element by default, if there are no items', () => {
        const component = mount(
          <KuiContextMenuPanel>
            <button data-test-subj="button" />
          </KuiContextMenuPanel>
        );

        expect(
          component.find('[data-test-subj="button"]').matchesElement(document.activeElement)
        ).toBe(true);
      });
    });

    describe('keyboard navigation of items', () => {
      let component;
      let showNextPanelHandler;
      let showPreviousPanelHandler;

      const items = [(
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
      )];

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

      it('focuses the first menu item by default, if there are items', () => {
        expect(
          component.find('[data-test-subj="itemA"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('down arrow key focuses the next menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.DOWN });

        expect(
          component.find('[data-test-subj="itemB"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('up arrow key focuses the previous menu item', () => {
        component.simulate('keydown', { keyCode: keyCodes.UP });

        expect(
          component.find('[data-test-subj="itemC"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('right arrow key shows next panel', () => {
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
