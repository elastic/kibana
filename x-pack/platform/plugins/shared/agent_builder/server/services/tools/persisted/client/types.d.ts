import type { ToolDefinition, ToolType } from '@kbn/agent-builder-common';
import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolProperties } from './storage';
export type ToolDocument = Pick<GetResponse<ToolProperties>, '_source' | '_id'>;
export type ToolPersistedDefinition<TConfig extends object = {}> = Omit<ToolDefinition<ToolType, TConfig>, 'readonly'> & {
    created_at: string;
    updated_at: string;
};
