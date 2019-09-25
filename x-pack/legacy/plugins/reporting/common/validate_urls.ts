/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isAbsoluteUrl from 'is-absolute-url';
import * as _ from 'lodash';

export const validateUrls = (urls: string[]): void => {
  const absoluteUrls = _.filter(urls, url => isAbsoluteUrl(url));

  if (absoluteUrls.length) {
    throw new Error(`Found invalid URL(s), all URLs must be relative: ${absoluteUrls.join(' ')}`);
  }
};
