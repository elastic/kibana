export declare function groupMessagesByPattern(messages: string[], params?: {
    patternThreshold?: number;
    minProbability?: number;
    limit?: number;
}): {
    truncatedPattern: string;
    probability: number;
    messages: string[];
}[];
