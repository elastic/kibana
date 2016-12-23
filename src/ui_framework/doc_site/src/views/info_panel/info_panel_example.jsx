import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Warning',
  description: (
    <p>Use this InfoPanel to warn the user against decisions they might regret.</p>
  ),
  html: require('./info_panel.html'),
  hasDarkTheme: false,
}]);
