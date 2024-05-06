/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getChatContext = () => {
  const { location, navigator, innerHeight, innerWidth } = window;
  const { hash, host, hostname, href, origin, pathname, port, protocol, search } = location;
  const { language, userAgent } = navigator;
  const { title, referrer } = document;

  return {
    window: {
      location: {
        hash,
        host,
        hostname,
        href,
        origin,
        pathname,
        port,
        protocol,
        search,
      },
      navigator: { language, userAgent },
      innerHeight,
      innerWidth,
    },
    document: {
      title,
      referrer,
    },
  };
};
