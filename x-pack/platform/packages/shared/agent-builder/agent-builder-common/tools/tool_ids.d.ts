export declare const toolIdRegexp: RegExp;
export declare const toolIdMaxLength = 64;
/**
 * Check if the given ID is a reserved ID
 * Atm this only checks for `new` because that's a value we're using for url paths on the UI.
 */
export declare const isReservedToolId: (id: string) => boolean;
/**
 * Validate that a tool id has the right format,
 * returning an error message if it fails the validation,
 * and undefined otherwise.
 *
 * @param toolId: the toolId to validate
 * @param builtIn: set to true if we're validating a built-in (internal) tool id.
 */
export declare const validateToolId: ({ toolId, builtIn, }: {
    toolId: string;
    builtIn: boolean;
}) => string | undefined;
