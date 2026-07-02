import type { Type } from '@kbn/config-schema';
import type { ToolCall } from '@kbn/inference-common';
import { ToolChoiceType } from '@kbn/inference-common';
import type { ChatCompleteRequestBody } from '../../common';
import type { PromptRequestBody } from '../../common/http_apis';
export declare const toolCallSchema: Type<ToolCall[]>;
export declare const toolsSchema: Type<Record<string, Readonly<{
    schema?: Readonly<{
        required?: string[] | undefined;
    } & {
        type: "object";
        properties: Record<string, any>;
    }> | undefined;
} & {
    description: string;
}>> | undefined>;
export declare const toolChoiceSchema: Type<ToolChoiceType | Readonly<{} & {
    function: string;
}> | undefined>;
export declare const messageOptionsSchema: import("@kbn/config-schema").ObjectType<{
    tools: Type<Record<string, Readonly<{
        schema?: Readonly<{
            required?: string[] | undefined;
        } & {
            type: "object";
            properties: Record<string, any>;
        }> | undefined;
    } & {
        description: string;
    }>> | undefined>;
    toolChoice: Type<ToolChoiceType | Readonly<{} & {
        function: string;
    }> | undefined>;
}>;
export declare const chatCompleteBaseSchema: import("@kbn/config-schema").ObjectType<{
    connectorId: Type<string>;
    maxRetries: Type<number | undefined>;
    retryConfiguration: Type<Readonly<{
        retryOn?: "all" | "auto" | undefined;
    } & {}> | undefined>;
    temperature: Type<number | undefined>;
    modelName: Type<string | undefined>;
    metadata: Type<Readonly<{
        attributes?: Readonly<{} & {}> | undefined;
        anonymization?: Readonly<{
            target?: Readonly<{} & {
                targetType: "index" | "data_view" | "index_pattern";
                targetId: string;
            }> | undefined;
            profileId?: string | undefined;
            replacementsId?: string | undefined;
        } & {}> | undefined;
        connectorTelemetry?: Readonly<{
            pluginId?: string | undefined;
            aggregateBy?: string | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    functionCalling: Type<"auto" | "native" | "simulated" | undefined>;
}>;
export declare const chatCompleteBodySchema: Type<ChatCompleteRequestBody>;
export declare const promptBodySchema: Type<PromptRequestBody>;
