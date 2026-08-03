/**
 * The route-level schema accepts both GA and legacy duration unit names (via `schema.oneOf`) so
 * that neither is rejected outright at the HTTP validation layer. This function performs the
 * additional runtime enforcement in the handler: it recursively walks `value` and validates every
 * `{type:'duration'}` object against the schema that is active for the current feature-flag state.
 *
 * @param value the request body (or any nested value) to inspect
 * @param useGASchemas when `true`, GA unit names are enforced (`min`, `auto`, `auto-approximate`);
 *   when `false`, the legacy schema accepts free-form unit strings (pre-GA behavior)
 * @returns an error message if a duration object uses units from the inactive set, otherwise `undefined`
 */
export declare const findInvalidDurationFormat: (value: unknown, useGASchemas: boolean, path?: string) => string | undefined;
/**
 * Recursively walks an API config and rewrites every `{type:'duration'}` object's `from`/`to`
 * units from GA short-form enums to legacy field-format names (e.g. `s` → `seconds`,
 * `auto-approximate` → `humanize`). Used at the route boundary to down-convert responses when
 * the `asCode.useGASchemas` feature flag is disabled, preserving pre-GA API compatibility.
 *
 * The shared `LensConfigBuilder` always emits GA names; this conversion is applied only in the
 * legacy flag state and returns new values without mutating the builder output.
 *
 * @param value the response body (or any nested value) to convert
 * @returns a structurally-equivalent value with GA duration units replaced by legacy names
 */
export declare const toLegacyDurationUnits: <T>(value: T) => T;
