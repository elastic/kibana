/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';
import header from './header.png';

export const revealImage: ElementFactory = () => ({
  name: 'revealImage',
  displayName: 'Image reveal',
  tags: ['graphic', 'proportion'],
  help: 'Reveals a percentage of an image',
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| revealImage origin=bottom image=null
| render`,
});
