/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import blessed from 'blessed';

let currentItemIndex: number;

const items: Array<{ label: string; logPanel?: blessed.Widgets.Log }> = [
  { label: 'soren' },
  { label: 'tomas' },
  { label: 'rubek' },
  { label: 'anton' }
];

const screen = blessed.screen();

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c', 'c'], () => {
  return process.exit(0);
});

/*
 * List
 ***************/
const list = blessed.list({
  top: '0',
  left: '0',
  width: '40%',
  height: '100%',
  mouse: true,
  keys: true,
  style: {
    selected: {
      bg: 'red'
    }
  }
});

// restart on enter
// list.key(['enter'], function() {
//   const index = this.selected;
//   logPanel.log(`${index} ${Math.random()}`);
//   logPanel.setScrollPerc(100);
//   screen.render();
// });

screen.append(list);

items.forEach(item => {
  const logPanel = createLogPanel();
  item.logPanel = logPanel;
  screen.append(logPanel);
  logPanel.hide();
  logPanel.log(`Hello ${item.label}`);

  setInterval(() => {
    logPanel.log(Date.now().toString());
  }, 1000);

  list.addItem(item.label);
});

// allow control the list with the keyboard
// ensure list always gets focus back!
list.focus();
list.on('blur', () => list.focus());

list.on('select item', (elm, index) => {
  if (items[currentItemIndex]) {
    items[currentItemIndex].logPanel.hide();
  }
  items[index].logPanel.show();
  currentItemIndex = index;
});

screen.render();

function createLogPanel() {
  return blessed.log({
    mouse: true,
    top: '0',
    right: '0',
    width: '60%',
    height: '100%',
    tags: true,
    border: {
      type: 'line'
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        inverse: true
      }
    },
    style: {
      fg: 'green',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });
}
