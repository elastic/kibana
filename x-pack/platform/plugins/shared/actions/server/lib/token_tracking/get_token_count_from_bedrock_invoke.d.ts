export interface InvokeBody {
    prompt?: string;
}
/**
 * Takes the Bedrock `run` and `test` sub action response and the request prompt as inputs.
 * Uses gpt-tokenizer encoding to calculate the number of tokens in the prompt and completion.
 * Returns an object containing the total, prompt, and completion token counts.
 * @param response (string) - the response completion from the `run` or `test` sub action
 * @param body - the stringified request prompt
 */
export declare function getTokenCountFromBedrockInvoke({ response, body, usage, }: {
    response: string;
    body: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}): Promise<{
    total: number;
    prompt: number;
    completion: number;
}>;
