import type { StreamQuery } from '@kbn/streams-schema';
export type Flow = 'manual' | 'ai';
export type SaveData = {
    type: 'single';
    query: StreamQuery;
    isUpdating?: boolean;
} | {
    type: 'multiple';
    queries: StreamQuery[];
};
