/**
 * True when a rule fetch failed because the current user lacks the privileges
 * required to read rules (HTTP 403). Used to surface an explanatory callout
 * instead of a generic error to users who can view episodes but not rules.
 */
export declare const isRuleForbiddenError: (error: unknown) => boolean;
