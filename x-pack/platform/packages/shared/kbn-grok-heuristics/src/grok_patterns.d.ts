export type GrokPatternMap = Record<string, string>;
export interface VerificationIssue {
    type: 'missing' | 'cycle' | 'syntax';
    pattern: string;
    reference?: string;
    trace?: string[];
    error?: string;
}
interface ResolveResult {
    resolved: GrokPatternMap;
    issues: VerificationIssue[];
}
/**
 * Recursively expands every %{PATTERN} reference so that the returned map
 * contains *fully inlined* regular expressions.  Also detects three classes of
 * errors:
 *   • *missing*  – reference to an undefined pattern
 *   • *cycle*    – circular dependencies (A → B → … → A)
 *   • *syntax*   – pattern cannot be compiled by JS RegExp after PCRE → JS
 */
export declare function buildResolvedPatterns(patterns: GrokPatternMap): ResolveResult;
/**
 * Reads the bundled `pattern_file.txt` and returns a *fully resolved* map where
 * every reference has been inlined **and** upgraded to a JavaScript-compatible
 * regular expression.  If the file contains undefined references, circular
 * definitions, or patterns that still fail to compile the function **throws**,
 * preventing Kibana from starting with an invalid pattern set.
 */
export declare function getRawPatternMap(): GrokPatternMap;
export type GrokRegexMap = Record<string, {
    complete: RegExp;
    partial: RegExp;
}>;
export declare function buildGrokRegexMap(overrides: Record<string, string>): GrokRegexMap;
export {};
