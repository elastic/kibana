import type { HttpSetup } from '@kbn/core/public';
import type { UpdateTagAssignmentsOptions, FindAssignableObjectsOptions, AssignableObject } from '../../../common/assignments';
export interface ITagAssignmentService {
    /**
     * Search API that only returns objects that are effectively assignable to tags for the current user.
     */
    findAssignableObjects(options: FindAssignableObjectsOptions): Promise<AssignableObject[]>;
    /**
     * Update the assignments for given tag ids, by adding or removing object assignments to them.
     */
    updateTagAssignments(options: UpdateTagAssignmentsOptions): Promise<void>;
    /**
     * Return the list of saved object types the user can assign tags to.
     */
    getAssignableTypes(): Promise<string[]>;
}
export interface TagAssignmentServiceOptions {
    http: HttpSetup;
}
export declare class TagAssignmentService implements ITagAssignmentService {
    private readonly http;
    constructor({ http }: TagAssignmentServiceOptions);
    findAssignableObjects({ search, types, maxResults }: FindAssignableObjectsOptions): Promise<AssignableObject[]>;
    updateTagAssignments({ tags, assign, unassign }: UpdateTagAssignmentsOptions): Promise<void>;
    getAssignableTypes(): Promise<string[]>;
}
