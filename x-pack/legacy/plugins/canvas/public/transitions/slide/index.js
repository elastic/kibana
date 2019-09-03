/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './slide.css';

export const slide = () => ({
  name: 'slide',
  displayName: 'Slide',
  help: 'Slide from one page to the next',
  enter: 'slideIn',
  exit: 'slideOut',
});
