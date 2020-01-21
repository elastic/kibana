/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';

export function parseNext(href: string, basePath = '') {
  const { query, hash } = parse(href, true);
  if (!query.next) {
    return `${basePath}/`;
  }

  let next: string;
  if (Array.isArray(query.next) && query.next.length > 0) {
    next = query.next[0];
  } else {
    next = query.next as string;
  }

  // validate that `next` is not attempting a redirect to somewhere
  // outside of this Kibana install
  const { protocol, hostname, port, pathname } = parse(
    next,
    false /* parseQueryString */,
    true /* slashesDenoteHost */
  );

  // We should explicitly compare `protocol`, `port` and `hostname` to null to make sure these are not
  // detected in the URL at all. For example `hostname` can be empty string for Node URL parser, but
  // browser (because of various bwc reasons) processes URL differently (e.g. `///abc.com` - for browser
  // hostname is `abc.com`, but for Node hostname is an empty string i.e. everything between schema (`//`)
  // and the first slash that belongs to path.
  if (protocol !== null || hostname !== null || port !== null) {
    return `${basePath}/`;
  }

  if (!String(pathname).startsWith(basePath)) {
    return `${basePath}/`;
  }

  return query.next + (hash || '');
}
