import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Icon',
  description: (
    <p>Use the <code className="guideCode">icon</code> class instead of the <code className="guideCode">fa</code> class for FontAwesome icons. This will make it easier for us to migrate away from FontAwesome.</p>
  ),
  html: require('./icon.html'),
  hasDarkTheme: false,
}, {
  title: 'Info',
  description: (
    <p>Use this Icon to denote useful information.</p>
  ),
  html: require('./icon_info.html'),
  hasDarkTheme: false,
}, {
  title: 'Success',
  description: (
    <p>Use this Icon to denote the successful completion of an action, e.g. filling out a form field correctly or a successful API request.</p>
  ),
  html: require('./icon_success.html'),
  hasDarkTheme: false,
}, {
  title: 'Warning',
  description: (
    <p>Use this Icon to denote an irregularity or potential problems.</p>
  ),
  html: require('./icon_warning.html'),
  hasDarkTheme: false,
}, {
  title: 'Error',
  description: (
    <p>Use this Icon to denote a failed attempt at an action, e.g. an invalid form field or an API error.</p>
  ),
  html: require('./icon_error.html'),
  hasDarkTheme: false,
}, {
  title: 'Inactive',
  description: (
    <p>Use this Icon to denote a disabled, inactive, off, offline, or asleep status.</p>
  ),
  html: require('./icon_inactive.html'),
  hasDarkTheme: false,
}, ]);
