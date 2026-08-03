import * as rt from 'io-ts';
/**
 * These values are used in a number of places including to define the accepted values in the
 * user_actions/_find api. These values should not be removed only new values can be added.
 */
export declare const UserActionTypes: {
    readonly assignees: "assignees";
    readonly comment: "comment";
    readonly connector: "connector";
    readonly description: "description";
    readonly pushed: "pushed";
    readonly tags: "tags";
    readonly title: "title";
    readonly status: "status";
    readonly settings: "settings";
    readonly severity: "severity";
    readonly create_case: "create_case";
    readonly delete_case: "delete_case";
    readonly category: "category";
    readonly customFields: "customFields";
    readonly observables: "observables";
    readonly extended_fields: "extended_fields";
    readonly template: "template";
};
type UserActionActionTypeKeys = keyof typeof UserActionTypes;
/**
 * This defines the type of the user action, meaning what individual action was taken, for example changing the status,
 * adding an assignee etc.
 */
export type UserActionType = (typeof UserActionTypes)[UserActionActionTypeKeys];
export declare const UserActionActions: {
    readonly add: "add";
    readonly create: "create";
    readonly delete: "delete";
    readonly update: "update";
    readonly push_to_service: "push_to_service";
};
export declare const UserActionActionsRt: rt.KeyofC<{
    readonly add: "add";
    readonly create: "create";
    readonly delete: "delete";
    readonly update: "update";
    readonly push_to_service: "push_to_service";
}>;
/**
 * This defines the high level category for the user action. Whether the user add, removed, updated something
 */
export type UserActionAction = rt.TypeOf<typeof UserActionActionsRt>;
export {};
