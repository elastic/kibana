import type { AssignableObject } from '../../../../common/assignments';
import type { AssignmentStatusMap, AssignmentOverrideMap } from '../types';
/**
 * Compute the list of objects that need to be added or removed from the
 * tag assignation, given their initial status and their current manual override.
 */
export declare const computeRequiredChanges: ({ objects, initialStatus, overrides, }: {
    objects: AssignableObject[];
    initialStatus: AssignmentStatusMap;
    overrides: AssignmentOverrideMap;
}) => {
    assigned: AssignableObject[];
    unassigned: AssignableObject[];
};
