import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Title',
  description: (
    <p>Works well with an H1.</p>
  ),
  html: require('./title.html'),
  hasDarkTheme: false,
}, {
  title: 'SubTitle',
  description: (
    <p>Works well with an H2.</p>
  ),
  html: require('./sub_title.html'),
  hasDarkTheme: false,
}, {
  title: 'Text',
  description: (
    <p>Works well with a <code className="guideCode">p</code>.</p>
  ),
  html: require('./text.html'),
  hasDarkTheme: false,
}]);
