import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'ToolBar',
  description: (
    <p>Use the ToolBar to surface controls for manipulating and filtering content, e.g. in a list, table, or menu.</p>
  ),
  html: require('./tool_bar.html'),
  hasDarkTheme: false,
}, {
  title: 'ToolBar with Search only',
  html: require('./tool_bar_search_only.html'),
  hasDarkTheme: false,
}, {
  title: 'ToolBarFooter',
  description: (
    <p>Use the ToolBarFooter in conjunction with the ToolBar. It can surface secondary controls or a subset of the primary controls.</p>
  ),
  html: require('./tool_bar_footer.html'),
  hasDarkTheme: false,
}]);
