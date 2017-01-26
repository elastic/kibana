/**
 * @typedef BreadCrumbUrl {Object}
 * @property breadcrumb {String} a breadcrumb
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
  return breadcrumbs.map(breadcrumb => {
    const breadCrumbStartIndex = url.toLowerCase().lastIndexOf(breadcrumb.toLowerCase());
    return {
      breadcrumb,
      url: url.substring(0, breadCrumbStartIndex + breadcrumb.length)
    };
  });
}
