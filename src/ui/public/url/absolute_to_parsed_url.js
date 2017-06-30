import { extractAppPathAndId } from './extract_app_path_and_id';
import { KibanaParsedUrl } from './kibana_parsed_url';
import { parse } from 'url';

/**
 *
 * @param absoluteUrl - an absolute url, e.g. https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id?hi=bye
 * @param basePath - An optional base path for kibana. If supplied, should start with a "/".
 * e.g. in https://localhost:5601/gra/app/kibana#/visualize/edit/viz_id the basePath is
 * "/gra".
 * @return {KibanaParsedUrl}
 */
export function absoluteToParsedUrl(absoluteUrl, basePath = '') {
  const { appPath, appId } = extractAppPathAndId(absoluteUrl, basePath);
  const { hostname, port, protocol } = parse(absoluteUrl);
  return new KibanaParsedUrl({ basePath, appId, appPath, hostname, port, protocol });
}
