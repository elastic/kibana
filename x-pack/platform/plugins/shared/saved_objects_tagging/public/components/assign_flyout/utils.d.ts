import type { AssignableObject } from '../../../common/assignments';
import type { AssignmentOverride, AssignmentStatus, AssignmentAction, AssignmentStatusMap } from './types';
export { getKey } from '../../../common/assignments';
/**
 * Return the assignment status resulting from applying
 * given `override` to given `initialStatus`.
 */
export declare const getOverriddenStatus: (initialStatus: AssignmentStatus, override: AssignmentOverride | undefined) => AssignmentStatus;
/**
 * Return the assignment action that was effectively performed,
 * given an object's `initialStatus` and `override`
 */
export declare const getAssignmentAction: (initialStatus: AssignmentStatus, override: AssignmentOverride | undefined) => AssignmentAction;
/**
 * Return a new array sorted by assignment status (full->partial->none) and then
 * by object title (desc).
 */
export declare const sortByStatusAndTitle: (objects: AssignableObject[], statusMap: AssignmentStatusMap) => AssignableObject[];
