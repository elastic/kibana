/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './fade.css';

export const fade = () => ({
  name: 'fade',
  displayName: 'Fade',
  help: 'Fade from one page to the next',
  enter: 'fadeIn',
  exit: 'fadeOut',
});
