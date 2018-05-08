import 'isomorphic-fetch';
import url from 'url';
import chrome from '../chrome';
import { metadata } from '../metadata';
import { merge } from 'lodash';

class FetchError extends Error {
  constructor(res) {
    super(res.statusText);
    this.res = res;
    Error.captureStackTrace(this, FetchError);
  }
}

export async function kfetch(options) {
  const { prependBasePath, pathname, query, ...requestOptions } = merge(
    {
      method: 'GET',
      prependBasePath: true,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': metadata.version,
      },
    },
    options
  );

  const fullUrl = url.format({
    pathname: prependBasePath ? chrome.addBasePath(pathname) : pathname,
    query,
  });

  const res = await fetch(fullUrl, requestOptions);

  if (!res.ok) {
    throw new FetchError(res);
  }

  return res.json();
}
