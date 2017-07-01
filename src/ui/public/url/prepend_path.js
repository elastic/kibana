import { parse, format } from 'url';
import { isString } from 'lodash';

/**
 *
 * @param {string} relativePath - a relative path that must start with a "/".
 * @param {string} newPath - the new path to prefix. ex: 'xyz'
 * @return {string} the url with the basePath prepended. ex. '/xyz/app/kibana#/management'. If
 * the relative path isn't in the right format (e.g. doesn't start with a "/") the relativePath is returned
 * unchanged.
 */
export function prependPath(relativePath, newPath = '') {
  if (!relativePath || !isString(relativePath)) {
    return relativePath;
  }

  const parsed = parse(relativePath, true, true);
  if (!parsed.host && parsed.pathname) {
    if (parsed.pathname[0] === '/') {
      parsed.pathname = newPath + parsed.pathname;
    }
  }

  return format({
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname,
    query: parsed.query,
    hash: parsed.hash,
  });
}
