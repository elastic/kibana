import React from 'react';
import { render, mount } from 'enzyme';
import {
  requiredProps,
  takeMountedSnapshot,
} from '../../test';

import { KuiContextMenu } from './context_menu';

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
    panel: 2,
  }, {
    name: '2b',
    panel: 2,
  }, {
    name: '2c',
    panel: 2,
  }],
};

const panel0 = {
  id: 0,
  title: '0',
  items: [{
    name: '1',
    panel: 1,
  }],
};

const panels = [
  panel0,
  panel1,
  panel2,
];

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
            panels={panels}
            initialPanelId={2}
            isVisible
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('idToPreviousPanelIdMap', () => {
      it('allows you to click the title button to go back to the previous panel', done => {
        const component = mount(
          <KuiContextMenu
            panels={panels}
            initialPanelId={2}
            isVisible
          />
        );

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();

        // Navigate to a different panel.
        component.find('[data-test-subj="contextMenuPanelTitleButton"]').simulate('click');

        setTimeout(() => {
          expect(takeMountedSnapshot(component))
            .toMatchSnapshot();
          done();
        });
      });
    });

    describe('isVisible', () => {
      it('causes the first panel to be shown when it becomes true', () => {
        const component = mount(
          <KuiContextMenu
            panels={panels}
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
});
