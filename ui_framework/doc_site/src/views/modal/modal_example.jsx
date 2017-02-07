import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Modal',
  html: require('./modal.html'),
  hasDarkTheme: false,
}, {
  title: 'ModalOverlay',
  html: require('./modal_overlay.html'),
  js: require('raw!./modal_overlay.js'),
  hasDarkTheme: false,
}]);
