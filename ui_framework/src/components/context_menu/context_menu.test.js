import React from 'react';
import { render, mount } from 'enzyme';
import {
  requiredProps,
  takeMountedSnapshot,
} from '../../test';

import { KuiContextMenu } from './context_menu';
import { keyCodes } from '../../services';

const panel2 = {
  id: 2,
  title: '2',
  content: <div>2</div>,
};

const panel1 = {
  id: 1,
  title: '1',
  items: [{
    name: '2a',
    panel: panel2,
    'data-test-subj': 'itemA',
  }, {
    name: '2b',
    panel: panel2,
    'data-test-subj': 'itemB',
  }, {
    name: '2c',
    panel: panel2,
    'data-test-subj': 'itemC',
  }],
};

const panel0 = {
  id: 0,
  title: '0',
  items: [{
    name: '1',
    panel: panel1,
  }],
};

const idToPanelMap = {
  0: panel0,
  1: panel1,
  2: panel2,
};

const idToPreviousPanelIdMap = {
  1: 0,
  2: 1,
};

describe('KuiContextMenu', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenu {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('idToPanelMap and initialPanelId', () => {
      it('renders the referenced panel', () => {
        const component = render(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            initialPanelId={2}
            isVisible
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('idToPreviousPanelIdMap', () => {
      it('allows you to click the title button to go back to the previous panel', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={2}
            isVisible
          />
        );

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();

        // Navigate to a different panel.
        component.find('[data-test-subj="contextMenuPanelTitleButton"]').simulate('click');

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();
      });
    });

    describe('isVisible', () => {
      it('causes the first panel to be shown when it becomes true', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={2}
            isVisible
          />
        );

        // Navigate to a different panel.
        component.find('[data-test-subj="contextMenuPanelTitleButton"]').simulate('click');

        // Hide and then show the menu to reset the panel to the initial one.
        component.setProps({ isVisible: false });
        component.setProps({ isVisible: true });

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();
      });
    });
  });

  describe('behavior', () => {
    describe('keyboard navigation of items', () => {
      it('focuses the first menu item by default, if there are items', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={1}
            isVisible
          />
        );

        expect(
          component.find('[data-test-subj="itemA"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('focuses the first focusable element by default, if there are no items', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={2}
            isVisible
          />
        );

        expect(
          component.find('[data-test-subj="contextMenuPanelTitleButton"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('down arrow key focuses the next menu item', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={1}
            isVisible
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.DOWN });

        expect(
          component.find('[data-test-subj="itemB"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('up arrow key focuses the previous menu item', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={1}
            isVisible
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.UP });

        expect(
          component.find('[data-test-subj="itemC"]').matchesElement(document.activeElement)
        ).toBe(true);
      });

      it('left arrow key focuses the previous panel', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={1}
            isVisible
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.LEFT });
        expect(component.state().currentPanelId).toBe(0);
      });

      it('right arrow key focuses the next panel', () => {
        const component = mount(
          <KuiContextMenu
            idToPanelMap={idToPanelMap}
            idToPreviousPanelIdMap={idToPreviousPanelIdMap}
            initialPanelId={1}
            isVisible
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.RIGHT });
        expect(component.state().currentPanelId).toBe(2);
      });
    });
  });
});
