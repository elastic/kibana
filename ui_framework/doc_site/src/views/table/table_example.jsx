import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Table',
  html: require('./table.html'),
  js: require('raw!./table.js'),
  hasDarkTheme: false,
}, {
  title: 'ControlledTable',
  html: require('./controlled_table.html'),
  hasDarkTheme: false,
}, {
  title: 'ControlledTable with LoadingItems',
  html: require('./controlled_table_loading_items.html'),
  hasDarkTheme: false,
}, {
  title: 'ControlledTable with NoItems',
  html: require('./controlled_table_no_items.html'),
  hasDarkTheme: false,
}, {
  title: 'ControlledTable with PromptForItems',
  html: require('./controlled_table_prompt_for_items.html'),
  hasDarkTheme: false,
}]);
