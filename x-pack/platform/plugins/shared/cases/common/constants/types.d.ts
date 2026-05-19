import type { SERVERLESS_PROJECT_TYPES, OWNERS } from './owners';
export declare enum HttpApiPrivilegeOperation {
    Read = "Read",
    Create = "Create",
    Delete = "Delete"
}
export type Owner = (typeof OWNERS)[number];
export type ServerlessProjectType = (typeof SERVERLESS_PROJECT_TYPES)[number];
