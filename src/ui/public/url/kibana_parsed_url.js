import { parse } from 'url';

import { prependPath } from './prepend_path';
import { modifyUrl } from '../../../utils';

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
   * @param {Object} options
   * @property {string} options.basePath - An optional base path for kibana. If supplied, should start with a "/".
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id the basePath is
   * "/gra".
   * @property {string} options.appId - the app id.
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id the app id is "kibana".
   * @property {string} options.appPath - the path for a page in the the app. Should start with a "/". Don't include the hash sign. Can
   * include all query parameters.
   * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id?g=state the appPath is
   * "/visualize/edit/viz_id?g=state"
   * @property {string} options.hostname - Optional hostname. Uses current window location's hostname if not supplied.
   * @property {string} options.port - Optional port. Uses current window location's port if not supplied.
   * @property {string} options.protocol - Optional protocol. Uses current window location's protocol if not supplied.
   */
  constructor(options) {
    const {
      appId,
      basePath = '',
      appPath = '',
      hostname = window.location.hostname,
      protocol = window.location.protocol,
      port = window.location.port
    } = options;

    this.basePath = basePath;
    this.appId = appId;
    this.appPath = appPath;
    this.hostname = hostname;
    this.protocol = protocol;
    this.port = port;
  }

  getGlobalState() {
    if (!this.appPath) {
      return '';
    }
    const parsedUrl = parse(this.appPath, true);
    const query = parsedUrl.query || {};
    return query._g || '';
  }

  setGlobalState(newGlobalState) {
    if (!this.appPath) { return; }

    this.appPath = modifyUrl(this.appPath, parsed => {
      parsed.query._g = newGlobalState;
    });
  }

  addQueryParameter(name, val) {
    this.appPath = modifyUrl(this.appPath, parsed => { parsed.query[name] = val; });
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
    return modifyUrl(this.getRootRelativePath(), parsed => {
      parsed.protocol = this.protocol;
      parsed.port = this.port;
      parsed.hostname = this.hostname;
    });
  }
}
