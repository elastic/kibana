import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import { type AgentBuilderAccessChecker } from './access';
export declare const createPublicEmbeddableChatAccess: ({ accessChecker, application, }: {
    accessChecker: AgentBuilderAccessChecker;
    application: ApplicationStart;
}) => (() => Promise<EmbeddableChatAccess>);
