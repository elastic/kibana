import type { UserIdAndName } from '../base/users';
import type { AgentDefinition } from './definition';
import { AgentVisibility } from './visibility';
export declare const isAgentOwner: ({ owner, currentUser, }: {
    owner?: UserIdAndName;
    currentUser?: UserIdAndName | null;
}) => boolean;
export declare const canChangeAgentVisibility: ({ agentId, owner, currentUser, isAdmin, }: {
    agentId?: string;
    owner?: UserIdAndName;
    currentUser?: UserIdAndName | null;
    isAdmin: boolean;
}) => boolean;
/** Legacy agents without a visibility field are treated as Public. */
export declare const hasAgentReadAccess: ({ visibility, owner, currentUser, isAdmin, }: {
    visibility?: AgentVisibility;
    owner?: UserIdAndName;
    currentUser?: UserIdAndName | null;
    isAdmin: boolean;
}) => boolean;
/** Legacy agents without a visibility field are treated as Public. */
export declare const hasAgentWriteAccess: ({ visibility, owner, currentUser, isAdmin, }: {
    visibility?: AgentVisibility;
    owner?: UserIdAndName;
    currentUser?: UserIdAndName | null;
    isAdmin: boolean;
}) => boolean;
/**
 * Whether the current user may edit agent settings, attach skills/tools, etc.
 */
export declare const canCurrentUserEditAgent: ({ agent, manageAgents, currentUser, isAdmin, isCurrentUserLoading, }: {
    agent: AgentDefinition;
    manageAgents: boolean;
    currentUser?: UserIdAndName | null;
    isAdmin: boolean;
    /** When true deny edit to avoid flashing incorrect actions. */
    isCurrentUserLoading?: boolean;
}) => boolean;
