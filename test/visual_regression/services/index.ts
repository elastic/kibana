/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { services as functionalServices } from '../../functional/services';
import { VisualTestingProvider } from './visual_testing';

export const services = {
  ...functionalServices,
  visualTesting: VisualTestingProvider,
};
