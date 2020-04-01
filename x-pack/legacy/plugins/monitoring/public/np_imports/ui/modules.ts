/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';

type PrivateProvider = (...args: any) => any;
interface Provider {
  name: string;
  provider: PrivateProvider;
}

class Modules {
  private _services: Provider[] = [];
  private _filters: Provider[] = [];
  private _directives: Provider[] = [];

  public get = (_name: string, _dep?: string[]) => {
    return this;
  };

  public service = (...args: any) => {
    this._services.push(args);
  };

  public filter = (...args: any) => {
    this._filters.push(args);
  };

  public directive = (...args: any) => {
    this._directives.push(args);
  };

  public addToModule = () => {
    angular.module('monitoring/services', []);
    angular.module('monitoring/filters', []);
    angular.module('monitoring/directives', []);

    this._services.forEach(args => {
      angular.module('monitoring/services').service.apply(null, args as any);
    });

    this._filters.forEach(args => {
      angular.module('monitoring/filters').filter.apply(null, args as any);
    });

    this._directives.forEach(args => {
      angular.module('monitoring/directives').directive.apply(null, args as any);
    });
  };
}

export const uiModules = new Modules();
