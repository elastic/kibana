import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { IndexSearchToolConfig } from '@kbn/agent-builder-common/tools';
import type { ToolTypeDefinition } from '../definitions';
declare const searchSchema: z.ZodObject<{
    nlQuery: z.ZodString;
}, z.core.$strip>;
type SearchSchemaType = typeof searchSchema;
export declare const getIndexSearchToolType: () => ToolTypeDefinition<ToolType.index_search, IndexSearchToolConfig, SearchSchemaType>;
export {};
