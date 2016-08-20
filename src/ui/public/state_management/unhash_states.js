import { parse as parseUrl, format as formatUrl } from 'url';
import { mapValues } from 'lodash';

export function UnhashStatesProvider(getAppState, globalState) {
  const getDefaultStates = () => [getAppState(), globalState].filter(Boolean);

  this.inAbsUrl = (urlWithHashes, states = getDefaultStates()) => {
    if (!urlWithHashes) return urlWithHashes;

    const urlWithHashesParsed = parseUrl(urlWithHashes, true);
    if (!urlWithHashesParsed.hostname) {
      // passing a url like "localhost:5601" or "/app/kibana" should be prevented
      throw new TypeError(
        'Only absolute urls should be passed to `unhashStates.inAbsUrl()`. ' +
        'Unable to detect url hostname.'
      );
    }

    if (!urlWithHashesParsed.hash) return urlWithHashes;

    const appUrl = urlWithHashesParsed.hash.slice(1); // trim the #
    if (!appUrl) return urlWithHashes;

    const appUrlParsed = parseUrl(urlWithHashesParsed.hash.slice(1), true);
    if (!appUrlParsed.query) return urlWithHashes;

    const appQueryWithoutHashes = this.inParsedQueryString(appUrlParsed.query || {}, states);
    return formatUrl({
      ...urlWithHashesParsed,
      hash: formatUrl({
        pathname: appUrlParsed.pathname,
        query: appQueryWithoutHashes,
      })
    });
  };

  this.inParsedQueryString = (parsedQueryString, states = getDefaultStates()) => {
    return mapValues(parsedQueryString, (val, key) => {
      const state = states.find(s => key === s.getQueryParamName());
      return state ? state.translateHashToRison(val) : val;
    });
  };
}
