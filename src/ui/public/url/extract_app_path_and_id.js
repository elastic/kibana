import { parse } from 'url';

/**
 * If the url is determined to contain an appId and appPath, it returns those portions. If it is not in the right
 * format and an appId and appPath can't be extracted, it returns an empty object.
 * @param {string} url - a relative or absolute url which contains an appPath, an appId, and optionally, a basePath.
 * @param {string} basePath - optional base path, if given should start with "/".
 */
export function extractAppPathAndId(url, basePath = '') {
  const parsedUrl = parse(url);
  if (!parsedUrl.path) {
    return { };
  }
  const pathWithoutBase = parsedUrl.path.slice(basePath.length);

  if (!pathWithoutBase.startsWith('/app/')) {
    return { };
  }

  const appPath = parsedUrl.hash && parsedUrl.hash.length > 0 ? parsedUrl.hash.slice(1) : '';
  return { appId: pathWithoutBase.slice('/app/'.length), appPath };
}
