/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const repeatImage: ElementFactory = () => ({
  name: 'repeatImage',
  displayName: 'Image repeat',
  type: 'image',
  help: 'Repeats an image N times',
  expression: `kibana
| selectFilter
| demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
