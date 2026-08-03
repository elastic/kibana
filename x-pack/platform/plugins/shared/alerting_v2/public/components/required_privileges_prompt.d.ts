import React from 'react';
import type { AlertingRequiredPrivilege } from '../lib/required_privileges';
export interface RequiredPrivilegesPromptProps {
    /** Human-readable name of the page the user attempted to view, e.g. "Rules". */
    pageName: string;
    /** Privileges the user is missing, shown so they know exactly what to request. */
    requiredPrivileges: readonly AlertingRequiredPrivilege[];
}
/**
 * Full-page interstitial shown when a user navigates to an alerting_v2
 * management page without the required feature privileges. Follows the
 * standard Kibana "Privileges required" empty-prompt pattern and lists the
 * feature privileges the user needs so they can request access.
 */
export declare const RequiredPrivilegesPrompt: ({ pageName, requiredPrivileges, }: RequiredPrivilegesPromptProps) => React.JSX.Element;
