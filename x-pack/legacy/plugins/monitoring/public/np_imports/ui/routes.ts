/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type RouteObject = [string, any];
interface Redirect {
  redirectTo: string;
}

class Routes {
  private _routes: RouteObject[] = [];
  private _redirect?: Redirect;

  public when = (...args: RouteObject) => {
    const [, routeOptions] = args;
    routeOptions.reloadOnSearch = false;
    this._routes.push(args);
    return this;
  };

  public otherwise = (redirect: Redirect) => {
    this._redirect = redirect;
    return this;
  };

  public addToProvider = ($routeProvider: any) => {
    this._routes.forEach(args => {
      $routeProvider.when.apply(this, args);
    });

    if (this._redirect) {
      $routeProvider.otherwise(this._redirect);
    }
  };
}
const uiRoutes = new Routes();
export default uiRoutes; // eslint-disable-line import/no-default-export
