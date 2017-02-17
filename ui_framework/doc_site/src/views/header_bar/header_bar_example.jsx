import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Header Bar',
  html: require('./header_bar.html'),
  hasDarkTheme: false,
}, {
  title: 'Two sections',
  html: require('./header_bar_two_sections.html'),
  hasDarkTheme: false,
}, {
  title: 'Static page',
  description: (
    <div>
      <p><a href="static_pages/header_bar.html" target="_blank">See static page</a></p>
    </div>
  ),
  source: require('../../static_pages/header_bar.html'),
  hasDarkTheme: false,
}]);
