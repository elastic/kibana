import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'MicroButton',
  description: (
    <p>Use MicroButtons for inline actions inside of Table rows.</p>
  ),
  html: require('./micro_button.html'),
  hasDarkTheme: false,
}, {
  title: 'MicroButtonGroup',
  description: (
    <p>Use the MicroButtonGroup to emphasize the relationships between a set of MicroButtons, and differentiate them from MicroButtons outside of the set.</p>
  ),
  html: require('./micro_button_group.html'),
  hasDarkTheme: false,
}, {
  title: 'Element variations',
  description: (
    <p>You can create a MicroButton using a button element or a link.</p>
  ),
  html: require('./micro_button_elements.html'),
  hasDarkTheme: false,
}]);
