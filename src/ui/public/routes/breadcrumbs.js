import { trim, startCase } from 'lodash';

/**
 *  Take a path (from $location.path() usually) and parse
 *  it's segments into a list of breadcrumbs
 *
 *  @param  {string} path
 *  @return {Array<Breadcrumb>}
 */
export function parsePathToBreadcrumbs(path) {
  return trim(path, '/')
    .split('/')
    .reduce((acc, id, i, parts) => [
      ...acc,
      {
        id,
        display: startCase(id),
        href: i === 0 ? `#/${id}` : `${acc[i - 1].href}/${id}`,
        current: i === (parts.length - 1)
      }
    ], []);
}
