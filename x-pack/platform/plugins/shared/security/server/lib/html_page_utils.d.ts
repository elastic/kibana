/**
 * Creates a simple HTML page that acts as an interstitial while redirecting the user to another location.
 *
 * TODO: The style tag will need to be updated to support a `nonce` attribute when we start enforcing style-src CSP.
 *
 * @param heading The heading text to display on the page.
 * @param location The URL to which the user will be redirected.
 * @returns A string containing the HTML content of the redirect page.
 */
export declare function createRedirectHtmlPage(heading: string, location: string): string;
