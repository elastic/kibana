/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { services as kibanaFunctionalServices } from '../../functional/services';
import { A11yProvider } from './a11y';

export const services = {
  ...kibanaFunctionalServices,
  a11y: A11yProvider,
};
