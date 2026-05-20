/**
 * Base Grok pattern definitions.
 * These are sourced from the official @kbn/grok-ui package which mirrors
 * Elasticsearch's built-in Grok patterns.
 *
 * The PATTERN_MAP contains all official patterns including:
 * - Basic: USERNAME, USER, INT, NUMBER, WORD, UUID, etc.
 * - Network: IP, IPV4, IPV6, MAC, HOSTNAME, etc.
 * - Email: EMAILADDRESS, EMAILLOCALPART
 * - Paths: PATH, UNIXPATH, WINPATH, URI, etc.
 * - Timestamps: TIMESTAMP_ISO8601, SYSLOGTIMESTAMP, HTTPDATE, etc.
 * - Log formats: LOGLEVEL, SYSLOGBASE, COMMONAPACHELOG, etc.
 */
export declare const BASE_GROK_PATTERNS: Record<string, string>;
/**
 * Result of compiling a Grok pattern for redaction.
 */
export interface CompiledRedactPattern {
    /** The compiled regular expression pattern */
    regex: string;
    /** The semantic name extracted from the pattern (e.g., "client" from %{IP:client}) */
    semanticName: string;
}
/**
 * Parses a single Grok pattern and extracts the syntax and semantic parts.
 *
 * Grok pattern syntax: %{SYNTAX:SEMANTIC[:TYPE]}
 * - SYNTAX: The pattern name (e.g., IP, EMAILADDRESS)
 * - SEMANTIC: The field name for the captured value (e.g., client, email)
 * - TYPE: Optional type conversion (int, float) - not used for redaction
 *
 * @param pattern - A Grok pattern like "%{IP:client}" or "%{EMAILADDRESS:email}"
 * @returns The parsed syntax and semantic, or null if invalid
 */
export declare function parseGrokPatternParts(pattern: string): {
    syntax: string;
    semantic: string;
} | null;
/**
 * Compiles a Grok pattern to a regular expression for use in redaction.
 *
 * @param pattern - A Grok pattern like "%{IP:client}"
 * @param customPatternDefinitions - Optional custom pattern definitions
 * @returns The compiled pattern with regex and semantic name, or null if pattern is unknown
 *
 * @example
 * compileGrokPatternToRegex("%{IP:client}")
 * // Returns: { regex: "(?:...IP regex...)", semanticName: "client" }
 *
 * @example
 * compileGrokPatternToRegex("%{EMAILADDRESS:email}")
 * // Returns: { regex: "(?:...email regex...)", semanticName: "email" }
 */
export declare function compileGrokPatternToRegex(pattern: string, customPatternDefinitions?: Record<string, string>): CompiledRedactPattern | null;
/**
 * Compiles multiple Grok patterns for use in redaction.
 *
 * @param patterns - Array of Grok patterns like ["%{IP:client}", "%{EMAILADDRESS:email}"]
 * @param customPatternDefinitions - Optional custom pattern definitions
 * @returns Array of compiled patterns (only valid patterns are returned)
 */
export declare function compileGrokPatternsToRegex(patterns: string[], customPatternDefinitions?: Record<string, string>): CompiledRedactPattern[];
/**
 * Checks if a pattern name is a known Grok pattern.
 *
 * @param patternName - The pattern name to check (e.g., "IP", "EMAILADDRESS")
 * @returns true if the pattern is known
 */
export declare function isKnownGrokPattern(patternName: string): boolean;
/**
 * Gets all available Grok pattern names.
 *
 * @returns Array of pattern names
 */
export declare function getAvailableGrokPatterns(): string[];
