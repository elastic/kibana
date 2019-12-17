/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { AbsoluteURLFactoryOptions } from '../types';

export const getAbsoluteUrlFactory = ({
  protocol,
  hostname,
  port,
  defaultBasePath,
}: AbsoluteURLFactoryOptions) => {
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
