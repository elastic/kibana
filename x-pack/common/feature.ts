/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';

export interface Feature {
  id: string;
  name: string;
  type: 'app' | 'subFeature';
  validLicenses?: Array<'basic' | 'gold' | 'platinum' | 'trial'>;
  icon?: IconType;
  description?: string;
}
