import { EsqlToolFieldType, ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod/v4';
import { EsqlParamSource } from '../types/tool_form_types';
export declare const esqlFormValidationSchema: z.ZodObject<{
    toolId: z.ZodString;
    description: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
    esql: z.ZodString;
    params: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        type: z.ZodEnum<typeof EsqlToolFieldType>;
        source: z.ZodEnum<typeof EsqlParamSource>;
        optional: z.ZodBoolean;
        defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>]>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<ToolType.esql>;
}, z.core.$strip>;
