const TAGS_WITH_WS = />\s+</g;

/**
 * Remove all of the whitespace between html tags
 * so that inline elements don't have extra spaces.
 *
 * If you have inline elements (span, a, em, etc.) and any
 * amount of whitespace around them in your markup, then the
 * browser will push them appart. This is ugly in certain
 * senarios and is only fixed by removing the whitespace
 * from the html in the first place (or ugly css hacks).
 *
 * @param  {string} html - the html to modify
 * @return {string} - modified html
 */
export function noWhiteSpace(html) {
  return html.replace(TAGS_WITH_WS, '><');
}
