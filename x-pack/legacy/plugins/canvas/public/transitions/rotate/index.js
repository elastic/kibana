/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './rotate.css';

export const rotate = () => ({
  name: 'rotate',
  displayName: 'Rotate',
  help: 'Rotate from one page to the next',
  enter: 'rotateIn',
  exit: 'rotateOut',
});
