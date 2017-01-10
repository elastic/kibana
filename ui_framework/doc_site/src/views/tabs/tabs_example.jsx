import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Tabs',
  html: require('./tabs.html'),
  js: require('raw!./tabs.js'),
  hasDarkTheme: false,
}]);
