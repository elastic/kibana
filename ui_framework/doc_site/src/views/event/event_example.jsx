import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Event',
  description: (
    <p>Events can represent updates, logs, notifications, and status changes.</p>
  ),
  html: require('./event.html'),
  hasDarkTheme: false,
}, {
  title: 'Event Menu',
  description: (
    <p>You&rsquo;ll typically want to present them within a Menu.</p>
  ),
  html: require('./event_menu.html'),
  hasDarkTheme: false,
},]);
