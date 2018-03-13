import React from 'react';
import { render, mount } from 'enzyme';
import {
  requiredProps,
  takeMountedSnapshot,
} from '../../test';

import { KuiContextMenu } from './context_menu';
import { setTimeout } from 'timers';

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

const tick = (ms = 0) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

describe('KuiContextMenu', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenu {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('panels and initialPanelId', () => {
      it('renders the referenced panel', () => {
        const component = render(
          <KuiContextMenu
            panels={panels}
            initialPanelId={2}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

      it('allows you to click the title button to go back to the previous panel', async () => {
        const component = mount(
          <KuiContextMenu
            panels={panels}
            initialPanelId={2}
          />
        );

        await tick(20);

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();

        // Navigate to a different panel.
        component.find('[data-test-subj="contextMenuPanelTitleButton"]').simulate('click');

        await tick(20);

        expect(takeMountedSnapshot(component))
          .toMatchSnapshot();
      });
    });
  });
});
