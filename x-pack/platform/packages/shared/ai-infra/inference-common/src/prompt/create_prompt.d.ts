import type { z } from '@kbn/zod/v4';
import type { PromptFactory } from './types';
export declare function createPrompt<TInput>(init: {
    name: string;
    description?: string;
    input: z.Schema<TInput>;
}): PromptFactory<TInput, []>;
