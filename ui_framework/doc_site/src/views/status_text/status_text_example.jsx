import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Info',
  html: require('./status_text_info.html'),
  hasDarkTheme: false,
}, {
  title: 'Success',
  html: require('./status_text_success.html'),
  hasDarkTheme: false,
}, {
  title: 'Warning',
  html: require('./status_text_warning.html'),
  hasDarkTheme: false,
}, {
  title: 'Error',
  html: require('./status_text_error.html'),
  hasDarkTheme: false,
}]);
