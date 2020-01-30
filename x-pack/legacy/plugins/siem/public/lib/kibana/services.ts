/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServices } from '../../plugin';

let _services: StartServices | null = null;

export const initServices = (services: StartServices) => {
  _services = services;
};

export const getServices = (): StartServices => {
  if (!_services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the siem app?'
    );
  }

  return _services;
};
