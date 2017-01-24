import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'TextInput',
  html: require('./text_input.html'),
  hasDarkTheme: false,
}, {
  title: 'StaticInput',
  description: (
    <p>Use StaticInput to display dynamic content in a form which the user isn&rsquo;t allowed to edit.</p>
  ),
  html: require('./static_input.html'),
  hasDarkTheme: false,
}, {
  title: 'TextArea',
  html: require('./text_area.html'),
  hasDarkTheme: false,
}, {
  title: 'TextArea, non-resizable',
  html: require('./text_area_non_resizable.html'),
  hasDarkTheme: false,
}, {
  title: 'CheckBox',
  html: require('./check_box.html'),
  hasDarkTheme: false,
}, {
  title: 'Select',
  html: require('./select.html'),
  hasDarkTheme: false,
}]);
