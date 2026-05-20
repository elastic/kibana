import { type StringifyOptions } from 'query-string';
/**
 * Parses `search` params and returns an object with them along with a `toUrlParams` function
 * that allows being able to retrieve a stringified version of an object (default is the
 * `urlParams` that was parsed) for use in the url.
 * Object will be recreated every time `search` changes.
 */
export declare function useUrlParams(): {
    urlParams: import("query-string").ParsedQuery<string>;
    toUrlParams: (params?: import("query-string").ParsedQuery<string>, options?: StringifyOptions) => string;
};
