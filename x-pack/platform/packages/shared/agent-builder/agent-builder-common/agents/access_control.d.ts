import type { UserIdAndName } from '../base/users';
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
