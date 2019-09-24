/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from './angular';
export * from './components';
export * from './constants';
export * from './errors';
export * from './shortcuts';
export * from './units';

export const getAppDescription = () =>
  i18n.translate('xpack.canvas.appDescription', {
    defaultMessage: 'Showcase your data in a pixel-perfect way.',
  });
