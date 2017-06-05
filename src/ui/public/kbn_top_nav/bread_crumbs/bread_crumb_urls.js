import _ from 'lodash';
/**
 * @typedef BreadCrumbUrl {Object}
 * @property title {String} the display title for the breadcrumb
 * @property path {String} the subdirectory for this particular breadcrumb
 * @property url {String} a url for the breadcrumb
 */

/**
 *
 * @param {Array.<String>} breadcrumbs An array of breadcrumbs for the given url.
 * @param {String} url The current url that the breadcrumbs have been generated for
 * @returns {Array.<BreadCrumbUrl> An array comprised of objects that
 * will contain both the url for the given breadcrumb, as well as the breadcrumb the url
 * was generated for.
 */
export function getBreadCrumbUrls(breadcrumbs, url) {
  // the url should not have a slash on the end or else the route will not be properly built
  const urlBase = url.replace(/\/+$/, '').replace(breadcrumbs.join('/'), '');
  return breadcrumbs.map((path, index) => {
    return {
      path: path,
      title: _.startCase(path),
      url: urlBase + breadcrumbs.slice(0, index + 1).join('/')
    };
  });
}
