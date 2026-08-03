export declare const VISUALIZATION_ATTACHMENT_TYPE = "visualization";
/**
 * Upper bound for a serialized Vega/Vega-Lite spec. Generous enough for layered /
 * faceted specs, but bounded so an oversized spec cannot be stored (in a
 * visualization attachment or a by-value dashboard Vega panel), closing the
 * unbounded-string DoS vector.
 */
export declare const MAX_VEGA_SPEC_LENGTH = 100000;
