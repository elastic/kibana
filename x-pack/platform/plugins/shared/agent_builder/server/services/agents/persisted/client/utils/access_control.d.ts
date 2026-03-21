import { type UserIdAndName } from '@kbn/agent-builder-common';
import type { AgentUpdateRequest } from '../../../../../../common/agents';
import type { AgentProperties } from '../storage';
export declare const hasReadAccess: ({ source, user, isAdmin, }: {
    source: AgentProperties;
    user: UserIdAndName;
    isAdmin: boolean;
}) => boolean;
export declare const hasWriteAccess: ({ source, user, isAdmin, }: {
    source: AgentProperties;
    user: UserIdAndName;
    isAdmin: boolean;
}) => boolean;
export declare const buildVisibilityReadFilter: ({ user }: {
    user: UserIdAndName;
}) => {
    bool: {
        should: Record<string, unknown>[];
        minimum_should_match: number;
    };
};
export declare const validateVisibilityUpdateAccess: ({ source, update, user, isAdmin, }: {
    source: AgentProperties;
    update: AgentUpdateRequest;
    user: UserIdAndName;
    isAdmin: boolean;
}) => boolean;
