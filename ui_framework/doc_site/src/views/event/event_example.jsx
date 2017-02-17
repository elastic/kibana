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
}, {
  title: 'Static page',
  description: (
    <div>
      <p><a href="static_pages/events.html" target="_blank">See static page</a></p>
    </div>
  ),
  source: require('../../static_pages/events.html'),
  hasDarkTheme: false,
}]);
