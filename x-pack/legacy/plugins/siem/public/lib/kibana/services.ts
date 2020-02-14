/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServices } from '../../plugin';

type GlobalServices = Pick<StartServices, 'http'>;

export class KibanaServices {
  private static services?: GlobalServices;

  public static init({ http }: StartServices) {
    this.services = { http };
  }

  public static get(): GlobalServices {
    if (!this.services) {
      throw new Error(
        'Kibana services not set - are you trying to import this module from outside of the SIEM app?'
      );
    }

    return this.services;
  }
}
