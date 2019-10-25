/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { ServerFacade } from '../types';

export function getAbsoluteUrlFactory(server: ServerFacade) {
  const config = server.config();

export const getAbsoluteUrlFactory = ({
  protocol,
  hostname,
  port,
  defaultBasePath,
}: AbsoluteURLFactory) => {
  return function getAbsoluteUrl({
    basePath = defaultBasePath,
    hash = '',
    path = '/app/kibana',
    search = '',
  } = {}) {
    return url.format({
      protocol,
      hostname,
      port,
      pathname: basePath + path,
      hash,
      search,
    });
  };
};
