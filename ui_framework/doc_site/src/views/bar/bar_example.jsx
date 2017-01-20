import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Bar',
  description: (
    <div>
      <p>Use the Bar to organize controls in a horizontal layout. This is especially useful for surfacing controls in the corners of a view.</p>
      <p><strong>Note:</strong> Instead of using this component with a Table, try using the ControlledTable, ToolBar, and ToolBarFooter components.</p>
    </div>
  ),
  html: require('./bar.html'),
  hasDarkTheme: false,
}, {
  title: 'One section',
  description: (
    <p>A Bar with one section will align it to the right, by default. To align it to the left, just add another section and leave it empty, or don't use a Bar at all.</p>
  ),
  html: require('./bar_one_section.html'),
  hasDarkTheme: false,
}, {
  title: 'Three sections',
  description: (
    <p>Technically the Bar can contain three or more sections, but there's no established use-case for this.</p>
  ),
  html: require('./bar_three_sections.html'),
  hasDarkTheme: false,
}]);
