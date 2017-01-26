import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Event',
  html: require('./event.html'),
  hasDarkTheme: false,
}, {
  title: 'Event Menu',
  html: require('./event_menu.html'),
  hasDarkTheme: false,
},]);
