import type { ProcessorSelector } from './types';
export declare const selectorToDataTestSubject: (selector: ProcessorSelector) => string;
type Path = string[];
/**
 * The below get and set functions are built with an API to make setting
 * and getting and setting values more simple.
 *
 * @remark
 * NEVER use these with objects that contain keys created by user input.
 */
/**
 * Given a path, get the value at the path
 *
 * @remark
 * If path is an empty array, return the source.
 */
export declare const getValue: <Result = any>(path: Path, source: any) => Result;
/**
 * Given a path, value and an object (array or object) set
 * the value at the path and copy objects values on the
 * path only. This is a partial copy mechanism that is best
 * effort for providing state updates to the UI, could break down
 * if other updates are made to non-copied parts of state in external
 * references - but this should not happen.
 *
 * @remark
 * If path is empty, just shallow copy source.
 */
export declare const setValue: <Target = any, Value = any>(path: Path, source: Target, value: Value) => Target;
export declare const checkIfSamePath: (pathA: ProcessorSelector, pathB: ProcessorSelector) => boolean;
export declare const hasTemplateSnippet: (str?: string) => boolean;
export declare const collapseEscapedStrings: (data: string) => string;
export declare const convertProccesorsToJson: (obj: {
    [key: string]: any;
}) => {
    [key: string]: any;
};
export {};
