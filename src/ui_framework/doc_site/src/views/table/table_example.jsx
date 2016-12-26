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
  title: 'ControlledTable with LoadingResults',
  html: require('./controlled_table_loading_results.html'),
  hasDarkTheme: false,
}, {
  title: 'ControlledTable with NoResults',
  html: require('./controlled_table_no_results.html'),
  hasDarkTheme: false,
}]);
