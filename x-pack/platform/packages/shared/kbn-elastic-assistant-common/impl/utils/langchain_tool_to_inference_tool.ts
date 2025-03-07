import { ToolDefinition as InferenceToolDefinition, ToolSchema as InferenceToolSchema } from '@kbn/inference-common';
import { StructuredToolInterface as LangChainStructuredToolInterface } from '@langchain/core/tools';
import { pick } from 'lodash';
import { ZodSchema } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

export const langchainToolToInferenceTool = (langchainTool: LangChainStructuredToolInterface): InferenceToolDefinition => {
    const schema = langchainTool.schema ? zodSchemaToInference(langchainTool.schema) : undefined;
    return {
        description: langchainTool.description,
        ...(schema ? { schema } : {}),
    }
}

export const langchainToolsToInferenceTools = (langchainTool: LangChainStructuredToolInterface[]) : Record<string, InferenceToolDefinition> => {
    return langchainTool.reduce((acc, tool) => {
        acc[tool.name] = langchainToolToInferenceTool(tool);
        return acc;
    }, {} as Record<string, InferenceToolDefinition>);
}

function zodSchemaToInference(schema: ZodSchema): InferenceToolSchema {
    return pick(zodToJsonSchema(schema), ['type', 'properties', 'required']) as InferenceToolSchema;
}