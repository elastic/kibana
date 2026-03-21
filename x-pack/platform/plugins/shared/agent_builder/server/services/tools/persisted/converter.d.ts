import type { ToolType } from '@kbn/agent-builder-common';
import type { InternalToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ZodObject } from '@kbn/zod/v4';
import type { ToolTypeDefinition } from '../tool_types';
import type { ToolTypeConversionContext } from '../tool_types/definitions';
import type { ToolPersistedDefinition } from './client';
export declare const convertPersistedDefinition: <TType extends ToolType, TConfig extends object, TPersistedConfig extends object = TConfig, TSchema extends ZodObject<any> = ZodObject<any>>({ tool, definition, context, }: {
    tool: ToolPersistedDefinition<TPersistedConfig> & {
        type: TType;
    };
    definition: ToolTypeDefinition<TType, TConfig, TSchema, TPersistedConfig>;
    context: ToolTypeConversionContext;
}) => InternalToolDefinition<TType, TConfig, TSchema>;
