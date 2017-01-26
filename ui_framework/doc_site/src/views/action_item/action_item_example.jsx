import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'ActionItem',
  html: require('./action_item.html'),
  hasDarkTheme: false,
}, {
  title: 'ActionItems in Menu',
  html: require('./action_items_in_menu.html'),
  hasDarkTheme: false,
}]);
