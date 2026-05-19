import type { SmithyMessageDecoderStream } from '@smithy/eventstream-codec';
import type { Logger } from '@kbn/logging';
export type SmithyStream = SmithyMessageDecoderStream<{
    metadata?: {
        usage: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
    };
}>;
export declare const getTokensFromBedrockClientSend: (responseStream: SmithyStream, logger: Logger) => Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
} | null>;
