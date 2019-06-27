/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from './constants';

export const API_ROOT = `/api/${PLUGIN_ID}`;

export enum RouteName {
  API_LIST = 'API_LIST',
  API_INFO = 'API_INFO',
  API_ZIP = 'API_ZIP',
  API_TGZ = 'API_TGZ',
}

type RouteNameKey = keyof typeof RouteName;
type RouteMap = Record<RouteNameKey, RouteDef>;

interface RouteDef {
  path: string;
  generatePath: (replacement?: string) => string;
}

const Routes: RouteMap = {
  [RouteName.API_LIST]: {
    path: `${API_ROOT}/list`,
    generatePath() {
      return this.path;
    },
  },
  [RouteName.API_INFO]: {
    path: `${API_ROOT}/package/{pkgkey}`,
    generatePath: replacePkgkey,
  },
  [RouteName.API_ZIP]: {
    path: `${API_ROOT}/package/{pkgkey}.zip`,
    generatePath: replacePkgkey,
  },
  [RouteName.API_TGZ]: {
    path: `${API_ROOT}/package/{pkgkey}.tar.gz`,
    generatePath: replacePkgkey,
  },
};

export function getNamedPath(key: RouteNameKey, replacement?: string): string {
  const route = getNamedRoute(key);
  if (route.generatePath) return route.generatePath(replacement);
  return route.path;
}

export function getNamedRoute(key: RouteNameKey): RouteDef {
  const route = Routes[key];
  if (!route) throw new Error(`no route with key '${key}'`);
  return route;
}

function replacePkgkey(this: RouteDef, pkgkey?: string): string {
  if (!pkgkey) throw new Error('missing replacement value for pkgkey');
  return this.path.replace('{pkgkey}', pkgkey);
}
