import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Basic Button',
  description: (
    <p>Use the basic Button in most situations.</p>
  ),
  html: require('./button_basic.html'),
  hasDarkTheme: false,
}, {
  title: 'Primary Button',
  description: (
    <p>Use the primary Button to represent the most common action. Generally, there won't be a need to present more than one of these at a time.</p>
  ),
  html: require('./button_primary.html'),
  hasDarkTheme: false,
}, {
  title: 'Danger Button',
  description: (
    <p>Danger Buttons represent irreversible, potentially regrettable actions.</p>
  ),
  html: require('./button_danger.html'),
  hasDarkTheme: false,
}, {
  title: 'Button with icon',
  description: (
    <p>You can toss an icon into a Button, with or without text.</p>
  ),
  html: require('./button_with_icon.html'),
  hasDarkTheme: false,
}, {
  title: 'ButtonGroup',
  description: (
    <p>Use the ButtonGroup to emphasize the relationships between a set of Buttons, and differentiate them from Buttons outside of the set.</p>
  ),
  html: require('./button_group.html'),
  hasDarkTheme: false,
}, {
  title: 'In ToolBar',
  description: (
    <p>This example verifies that Buttons are legible against the ToolBar's background.</p>
  ),
  html: require('./buttons_in_tool_bar.html'),
  hasDarkTheme: false,
}, {
  title: 'Element variations',
  description: (
    <p>You can create a Button using a button element, link, or input[type="submit"].</p>
  ),
  html: require('./button_elements.html'),
  hasDarkTheme: false,
}]);
