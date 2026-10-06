export declare class Tokenizer {
    /**
     * Approximates the number of tokens in a string,
     * assuming 4 characters per token.
     */
    static count(input: string): number;
    /**
     * If the text is longer than the amount of tokens,
     * truncate and mark as truncated.
     */
    static truncate(input: string, maxTokens: number): {
        tokens: number;
        truncated: boolean;
        text: string;
    };
}
