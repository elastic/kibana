/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServices } from '../../plugin';

type GlobalServices = Pick<StartServices, 'http' | 'uiSettings'>;
let _services: GlobalServices | null = null;

export const initServices = (services: StartServices) => {
  const { http, uiSettings } = services;

  _services = { http, uiSettings };
};

export const getServices = (): GlobalServices => {
  if (!_services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the SIEM app?'
    );
  }

  return _services;
};
