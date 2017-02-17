import React from 'react';

import {
  createExample,
} from '../../services';
export default createExample([{
  title: 'ViewContent',
  description: (
    <div>
      <p>Use ViewContent in conjunction with the View component to present full-width content.</p>
      <p>Best used with Visualizations and Dashboards.</p>
      <p><a href="static_pages/view_content.html" target="_blank">See example</a></p>
    </div>
  ),
  source: require('../../static_pages/view_content.html'),
  hasDarkTheme: false,
}, {
  title: 'ViewContent with constrained width',
  description: (
    <div>
      <p>Use the constrained-width variation of ViewContent to limit the width of the content.</p>
      <p>This is useful for content like text, sparser tables, and forms, which look weird at 100% width on large monitors.</p>
      <p><a href="static_pages/view_content_with_constrained_width.html" target="_blank">See example</a></p>
    </div>
  ),
  source: require('../../static_pages/view_content_with_constrained_width.html'),
  hasDarkTheme: false,
}]);
