/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';

type PrivateProvider = (...args: unknown[]) => unknown;
interface Provider {
  name: string;
  provider: PrivateProvider;
}

class Modules {
  private services: Provider[] = [];
  private filters: Provider[] = [];
  private directives: Provider[] = [];

  public get = (_name: string, _dep?: string[]) => {
    return this;
  };

  public service = (...args: any) => {
    this.services.push(args);
  };

  public filter = (...args: any) => {
    this.filters.push(args);
  };

  public directive = (...args: any) => {
    this.directives.push(args);
  };

  public implement = () => {
    angular.module('monitoring/services', []);
    angular.module('monitoring/filters', []);
    angular.module('monitoring/directives', []);

    this.services.forEach(args => {
      angular.module('monitoring/services').service.apply(null, args as any );
    });

    this.filters.forEach(args => {
      angular.module('monitoring/filters').filter.apply(null, args as any);
    });

    this.directives.forEach(args => {
      angular.module('monitoring/directives').directive.apply(null, args as any);
    });
  };
}

export const uiModules = new Modules();
