import type { EuiBadgeProps } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { UserIdAndName } from '../../base/users';
export declare enum AgentAccessControlMode {
    Private = "private",
    Public = "public",
    Shared = "shared"
}
/** Map from agent access-control mode to the icon used in the UI. */
export declare const ACCESS_CONTROL_MODE_ICON: Record<AgentAccessControlMode, EuiIconType>;
export declare const ACCESS_CONTROL_MODE_BADGE_COLOR: Record<AgentAccessControlMode, EuiBadgeProps['color']>;
/**
 * Hierarchical role granted to a principal on an individual agent.
 * Each role implies all the capabilities of the lower roles.
 *
 * - User:    see, list, read details, run/converse
 * - Editor:  User + update fields/configuration
 * - Manager: Editor + delete + manage access control
 *
 * Design note: there is intentionally no "Viewer" tier. If a user can see an agent at
 * all, they can run it — splitting "see" from "run" added complexity without a real
 * use case for an agent-style product.
 */
export declare enum AgentAccessControlRole {
    User = "user",
    Editor = "editor",
    Manager = "manager"
}
/**
 * V1 only supports `'user'` principals. Role-based grants are planned for V2 once the
 * upstream Elasticsearch change for unprivileged role listing lands.
 */
export type AgentAccessControlPrincipalType = 'user';
/**
 * An entry carries at least one of `id` or `name`. New entries are written with a stable `id`;
 * entries persisted before stable ids were adopted only have `name` and are matched on username
 * until they are removed and re-added (lazy migration).
 */
export interface AgentAccessControlEntry {
    type: AgentAccessControlPrincipalType;
    /** Stable user id (profile uid, or the realm-qualified fallback from `toStableUserId`). */
    id?: string;
    /** Case-sensitive Kibana username. Legacy; only present on entries written before `id`. */
    name?: string;
    role: AgentAccessControlRole;
    added_at?: string;
}
/** Identity key for an entry: `id` when present, otherwise the legacy `name`. */
export declare const getAccessControlEntryKey: (entry: AgentAccessControlEntry) => string;
/** True when owner matching already covers this entry, so the grant adds nothing. */
export declare const isEntryCoveredByOwner: (entry: AgentAccessControlEntry, owner: UserIdAndName | undefined) => boolean;
export interface AgentAccessControl {
    access_mode: AgentAccessControlMode;
    entries: AgentAccessControlEntry[];
}
/**
 * Applied to newly created agents only. Agents that carry no access control — built-ins, and
 * documents predating the field — deliberately resolve to Public instead.
 */
export declare const getDefaultAgentAccessControl: () => AgentAccessControl;
export declare const AGENT_ACCESS_CONTROL_MAX_ENTRIES = 100;
/** Matches the conversation ACL principal id cap (`CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH`). */
export declare const AGENT_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;
export declare const isAgentAccessControlRole: (value: unknown) => value is AgentAccessControlRole;
/** Returns true when `role` is at or above the `threshold` in the role hierarchy. */
export declare const accessControlRoleMeets: (role: AgentAccessControlRole, threshold: AgentAccessControlRole) => boolean;
/** Returns the higher of two roles, or undefined if both inputs are undefined. */
export declare const maxAccessControlRole: (a: AgentAccessControlRole | undefined, b: AgentAccessControlRole | undefined) => AgentAccessControlRole | undefined;
