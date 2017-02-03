import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Menu',
  html: require('./menu.html'),
  hasDarkTheme: false,
}, {
  title: 'Menu, contained',
  html: require('./menu_contained.html'),
  hasDarkTheme: false,
}]);
