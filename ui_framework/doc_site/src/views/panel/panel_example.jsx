import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Panel',
  html: require('./panel.html'),
  hasDarkTheme: false,
}, {
  title: 'Panel with PanelHeader',
  description: (
    <p>The Panel requires a special class when used with a PanelHeader.</p>
  ),
  html: require('./panel_with_header.html'),
  hasDarkTheme: false,
}]);
