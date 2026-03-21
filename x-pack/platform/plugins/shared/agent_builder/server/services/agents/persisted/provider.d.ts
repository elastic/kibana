import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { AgentProviderFn } from '../agent_source';
import type { ToolsServiceStart } from '../../tools';
import type { InternalAgentDefinition } from '../agent_registry';
import type { PersistedAgentDefinition } from './types';
export declare const createPersistedProviderFn: (opts: {
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    toolsService: ToolsServiceStart;
    logger: Logger;
}) => AgentProviderFn<false>;
export declare const toInternalDefinition: ({ definition, }: {
    definition: PersistedAgentDefinition;
}) => InternalAgentDefinition;
