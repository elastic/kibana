/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const repeatImage: ElementFactory = () => ({
  name: 'repeatImage',
  displayName: 'Image repeat',
  type: 'image',
  help: 'Repeats an image N times',
  expression: `filters
| demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
