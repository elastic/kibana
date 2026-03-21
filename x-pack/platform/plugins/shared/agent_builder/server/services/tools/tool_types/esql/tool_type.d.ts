import type { ZodObject } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { EsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql';
import { type EsqlToolPersistedConfig } from './esql_legacy';
import type { ToolTypeDefinition } from '../definitions';
export declare const getEsqlToolType: () => ToolTypeDefinition<ToolType.esql, EsqlToolConfig, ZodObject<any>, EsqlToolPersistedConfig>;
