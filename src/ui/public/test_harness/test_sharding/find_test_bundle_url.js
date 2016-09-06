/**
 *  We don't have a lot of options for passing arguments to the page that karma
 *  creates, so we tack some query string params onto the test bundle script url.
 *
 *  This function finds that url by looking for a script tag that has
 *  the "/tests.bundle.js" segment
 *
 *  @return {string} url
 */
export function findTestBundleUrl() {
  const scriptTags = document.querySelectorAll('script[src]');
  const scriptUrls = [].map.call(scriptTags, el => el.getAttribute('src'));
  const testBundleUrl = scriptUrls.find(url => url.includes('/tests.bundle.js'));

  if (!testBundleUrl) {
    throw new Error('test bundle url couldn\'t be found');
  }

  return testBundleUrl;
}
