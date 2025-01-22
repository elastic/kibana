/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const image: ElementFactory = () => ({
  name: 'image',
  displayName: 'Image',
  type: 'image',
  help: 'A static image',
  icon: 'image',
  expression: `image dataurl=null mode="contain"
| render`,
});
