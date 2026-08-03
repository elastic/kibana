import { AgentAccessControlRole, AgentAccessControlMode } from '@kbn/agent-builder-common';
export declare const ROLE_LABEL: Record<AgentAccessControlRole, string>;
export declare const ROLE_DESCRIPTION: Record<AgentAccessControlRole, string>;
/**
 * Roles that meaningfully grant something on top of a given access control mode.
 *
 * For Public/Shared agents the see/use baseline is already global, so a `User` entry
 * would be a no-op. We hide it in the role dropdown to prevent misleading rows.
 */
export declare const selectableRolesForAccessControlMode: (accessControlMode: AgentAccessControlMode | undefined) => AgentAccessControlRole[];
