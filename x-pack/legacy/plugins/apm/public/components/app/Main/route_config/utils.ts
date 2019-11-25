/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { template, templateSettings } from 'lodash';
import { routes } from './';

export const getRouteByName = (routeName: string) =>
  routes.find(({ name }) => name === routeName);

/**
 * Generates the path converting the params:
 * ie:
 * path: /services/:serviceName/service-map
 * pathParams: {serviceName: 'opbeans-ruby'}
 * Will be converted to: /services/opbeans-ruby/service-map
 *
 * @param routeName
 * @param pathParams
 */
export const generatePath = (routeName: string, pathParams?: object) => {
  const route = getRouteByName(routeName);
  if (route && route.path) {
    const { path } = route;
    // Matches any string with ':param/'
    templateSettings.interpolate = /:([\s\S].+?(?=\/))/;
    return pathParams ? template(path)(pathParams) : path;
  }

  return '/';
};
