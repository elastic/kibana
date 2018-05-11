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

export async function kfetch(fetchOptions, kibanaOptions) {
  // fetch specific options with defaults
  const { pathname, query, ...combinedFetchOptions } = merge(
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': metadata.version,
      },
    },
    fetchOptions
  );

  // kibana specific options with defaults
  const combinedKibanaOptions = {
    prependBasePath: true,
    ...kibanaOptions,
  };

  const fullUrl = url.format({
    pathname: combinedKibanaOptions.prependBasePath ? chrome.addBasePath(pathname) : pathname,
    query,
  });

  const res = await fetch(fullUrl, combinedFetchOptions);

  if (!res.ok) {
    throw new FetchError(res);
  }

  return res.json();
}
