import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import encodeUriQuery from 'encode-uri-query';

import {
  stringify as stringifyQueryString
} from 'querystring';

import { unhashQueryString } from './unhash_query_string';

export function unhashUrl(urlWithHashes, states) {
  if (!urlWithHashes) return urlWithHashes;

  const urlWithHashesParsed = parseUrl(urlWithHashes, true);
  if (!urlWithHashesParsed.hostname) {
    // passing a url like "localhost:5601" or "/app/kibana" should be prevented
    throw new TypeError(
      'Only absolute urls should be passed to `unhashUrl()`. ' +
      'Unable to detect url hostname.'
    );
  }

  if (!urlWithHashesParsed.hash) return urlWithHashes;

  const appUrl = urlWithHashesParsed.hash.slice(1); // trim the #
  if (!appUrl) return urlWithHashes;

  const appUrlParsed = parseUrl(urlWithHashesParsed.hash.slice(1), true);
  if (!appUrlParsed.query) return urlWithHashes;

  const appQueryWithoutHashes = unhashQueryString(appUrlParsed.query || {}, states);

  // encodeUriQuery implements the less-aggressive encoding done naturally by
  // the browser. We use it to generate the same urls the browser would
  const appQueryStringWithoutHashes = stringifyQueryString(appQueryWithoutHashes, null, null, {
    encodeURIComponent: encodeUriQuery
  });

  return formatUrl({
    ...urlWithHashesParsed,
    hash: formatUrl({
      pathname: appUrlParsed.pathname,
      search: appQueryStringWithoutHashes,
    })
  });
}
