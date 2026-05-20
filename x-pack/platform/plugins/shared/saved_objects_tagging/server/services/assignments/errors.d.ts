/**
 * Error returned from {@link AssignmentService#updateTagAssignments}
 */
export declare class AssignmentError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
