import type { State } from './processors_reducer';
import type { ProcessorInternal, ProcessorSelector } from '../types';
/**
 * We know that it must be an on-failure handler if the selector length is greater than 2
 * because the first element will always be either processors or the global on-failure
 * array and the second element will be a number indicating the processor position in the
 * array. Anything more than that we know we are add an on failure handler.
 */
export declare const isOnFailureSelector: (selector: ProcessorSelector) => boolean;
export declare const PARENT_CHILD_NEST_ERROR = "PARENT_CHILD_NEST_ERROR";
export declare const duplicateProcessor: (sourceProcessor: ProcessorInternal) => ProcessorInternal;
export declare const isChildPath: (a: ProcessorSelector, b: ProcessorSelector) => boolean;
/**
 * Unsafe!
 *
 * This function takes a data structure and mutates it in place.
 *
 * It is convenient for updating the processors (see {@link ProcessorInternal})
 * structure in this way because the structure is recursive. We are moving processors between
 * different arrays, removing in one, and adding to another. The end result should be consistent
 * with these actions.
 *
 * @remark
 * This function assumes parents cannot be moved into themselves.
 */
export declare const unsafeProcessorMove: (state: State, source: ProcessorSelector, destination: ProcessorSelector) => State;
