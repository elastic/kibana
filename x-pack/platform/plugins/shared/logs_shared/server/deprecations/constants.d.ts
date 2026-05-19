/**
 * Number of spaces to address concurrently.
 * We don't want to loop through all the spaces concurrently to avoid putting too much pressure on the memory in case that there are too many spaces.
 */
export declare const CONCURRENT_SPACES_TO_CHECK = 500;
