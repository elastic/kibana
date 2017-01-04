import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'TextInput',
  html: require('./text_input.html'),
  hasDarkTheme: false,
}, {
  title: 'TextArea',
  html: require('./text_area.html'),
  hasDarkTheme: false,
}, {
  title: 'CheckBox',
  html: require('./check_box.html'),
  hasDarkTheme: false,
}]);
