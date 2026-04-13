import type { Streams } from '@kbn/streams-schema';
export declare const useUpdateStreams: (name: string) => (request: Streams.all.UpsertRequest) => Promise<void>;
