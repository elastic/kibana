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
}]);
