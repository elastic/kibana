/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains utility functions for performing operations on URLs.
 */

/**
 *
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
export function relativeToAbsolute(url: string) {
  // convert all link urls to absolute urls
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

/**
 * Returns whether the supplied String represents a web URL
 * i.e. whether it starts with http:// or https://
 * @param {string} url URL to test
 * @return {boolean} true if it starts with http:// or https://, false otherwise
 */
export function isWebUrl(url: string) {
  const absoluteUrl = relativeToAbsolute(url);
  return absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://');
}
