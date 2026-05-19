import type { BackoffFactory } from './types';
export declare const fullJitterBackoffFactory: ({ baseDelay, maxBackoffTime, }: {
    baseDelay: number;
    maxBackoffTime: number;
}) => BackoffFactory;
