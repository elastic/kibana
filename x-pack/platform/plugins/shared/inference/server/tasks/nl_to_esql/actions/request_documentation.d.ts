import type { ToolOptions, Message, ChatCompleteMetadata, ChatCompleteOptions, OutputAPI } from '@kbn/inference-common';
import type { EsqlPrompts } from '../doc_base/load_data';
export declare const requestDocumentation: ({ outputApi, esqlPrompts, messages, connectorId, functionCalling, maxRetries, retryConfiguration, metadata, toolOptions, }: {
    outputApi: OutputAPI;
    messages: Message[];
    esqlPrompts: EsqlPrompts;
    connectorId: string;
    metadata?: ChatCompleteMetadata;
    toolOptions: ToolOptions;
} & Pick<ChatCompleteOptions, "maxRetries" | "retryConfiguration" | "functionCalling">) => import("rxjs").Observable<{
    id: "request_documentation";
    output: import("utility-types").Required<{
        commands?: string[] | undefined;
        functions?: string[] | undefined;
    }, never>;
    content: string;
} & {
    type: import("@kbn/inference-common").OutputEventType.OutputComplete;
}>;
