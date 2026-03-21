import type { EsqlToolConfig } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
export declare function createSchemaFromParams(params: EsqlToolConfig['params']): z.ZodObject<any>;
