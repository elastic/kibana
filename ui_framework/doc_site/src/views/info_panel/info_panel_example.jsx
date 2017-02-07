import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Info',
  description: (
    <p>Use this InfoPanel to generally inform the user.</p>
  ),
  html: require('./info_panel_info.html'),
  hasDarkTheme: false,
}, {
  title: 'Success',
  description: (
    <p>Use this InfoPanel to notify the user of an action successfully completing.</p>
  ),
  html: require('./info_panel_success.html'),
  hasDarkTheme: false,
}, {
  title: 'Warning',
  description: (
    <p>Use this InfoPanel to warn the user against decisions they might regret.</p>
  ),
  html: require('./info_panel_warning.html'),
  hasDarkTheme: false,
}, {
  title: 'Error',
  description: (
    <p>Use this InfoPanel to let the user know something went wrong.</p>
  ),
  html: require('./info_panel_error.html'),
  hasDarkTheme: false,
}]);
