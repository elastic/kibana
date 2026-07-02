import type { Plugin } from 'unified';
/**
 * Markdown parser for anonymized inline syntax.
 * Matches `!{anonymized{...}}` and passes the JSON configuration on the node.
 */
export declare const anonymizedHighlightPlugin: Plugin;
