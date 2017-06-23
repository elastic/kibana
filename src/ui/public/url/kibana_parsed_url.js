import { parse, format } from 'url';

import { prependPath } from './prepend_path';

/**
 * Represents the pieces that make up a url in Kibana, offering some helpful functionality for
 * translating those pieces into absolute or relative urls. A Kibana url with a basePath looks like this:
 * http://localhost:5601/basePath/app/appId#/an/appPath?with=query&params
 * basePath is "/basePath"
 * appId is "appId"
 * appPath is "/an/appPath?with=query&params"
 *
 * Almost all urls in Kibana should have this structure, including the "/app" portion in front of the appId
 * (one exception is the login link).
 */
export class KibanaParsedUrl {
  /**
   *
   * @param basePath - An optional base path for kibana. If supplied, should start with a "/".
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id the basePath is
   * "/gra".
   * @param appId - the app id.
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id the app id is "kibana".
   * @param appPath - the path for a page in the the app. Should start with a "/". Don't include the hash sign. Can
   * include all query parameters.
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id?g=state the appPath is
   * "/visualize/edit/viz_id?g=state"
   */
  constructor({ appId, basePath = '', appPath, host, protocol }) {
    this.basePath = basePath;
    this.appId = appId;
    this.appPath = appPath;
    this.host = host;
    this.protocol = protocol;
  }

  getGlobalState() {
    if (!this.appPath) {
      return '';
    }
    const parsedUrl = parse(this.appPath, true);
    const query = parsedUrl.query || {};
    return query._g;
  }

  setGlobalState(newGlobalState) {
    const parsedUrl = parse(this.appPath, true);
    const query = parsedUrl.query || {};
    query._g = newGlobalState;

    this.appPath = format({
      pathname: parsedUrl.pathname,
      query: query,
    });
  }

  getHashedAppPath() {
    return `#${this.appPath}`;
  }

  getAppBasePath() {
    return `/${this.appId}`;
  }

  getAppRootPath() {
    return `/app${this.getAppBasePath()}${this.getHashedAppPath()}`;
  }

  getRootRelativePath() {
    return prependPath(this.getAppRootPath(), this.basePath);
  }

  getAbsoluteUrl() {
    const parsedUrl = parse(this.getRootRelativePath());
    return format({
      protocol: this.protocol,
      host: this.host,
      pathname: parsedUrl.pathname,
      query: parsedUrl.query,
      hash: parsedUrl.hash,
    });
  }
}
