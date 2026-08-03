import { AlertConsumers } from '@kbn/rule-data-utils';
import type { ServerlessProjectType, Owner } from './types';
/**
 * Owner
 */
export declare const SECURITY_SOLUTION_OWNER: "securitySolution";
export declare const OBSERVABILITY_OWNER: "observability";
export declare const GENERAL_CASES_OWNER: "cases";
export declare const SECURITY_PROJECT_TYPE_ID = "security";
export declare const OBSERVABILITY_PROJECT_TYPE_ID = "observability";
export declare const OWNERS: readonly ["cases", "observability", "securitySolution"];
export declare const SERVERLESS_PROJECT_TYPES: readonly ["security", "observability"];
interface RouteInfo {
    id: Owner;
    appId: string;
    label: string;
    iconType: string;
    appRoute: string;
    /** Kibana-registered base path for the app (what `getUrlForApp(appId)` prepends). */
    appBasePath: string;
    /** Path within the app where the cases section lives, passed as `path` to `getUrlForApp`. */
    casesBasePath: string;
    validRuleConsumers?: readonly AlertConsumers[];
    serverlessProjectType?: ServerlessProjectType;
}
export declare const OWNER_INFO: Record<Owner, RouteInfo>;
export {};
