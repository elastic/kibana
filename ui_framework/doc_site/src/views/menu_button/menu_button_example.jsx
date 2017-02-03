import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Basic MenuButton',
  html: require('./menu_button_basic.html'),
  hasDarkTheme: false,
}, {
  title: 'Danger MenuButton',
  html: require('./menu_button_danger.html'),
  hasDarkTheme: false,
}, {
  title: 'MenuButton with Icon',
  description: (
    <p>You can use a MenuButton with an Icon, with or without text.</p>
  ),
  html: require('./menu_button_with_icon.html'),
  hasDarkTheme: false,
}, {
  title: 'MenuButtonGroup',
  html: require('./menu_button_group.html'),
  hasDarkTheme: false,
}]);
