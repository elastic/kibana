import type { Streams } from '@kbn/streams-schema';
import type { PartitionSuggestion } from './use_review_suggestions_form';
export declare const useMatchRate: (definition: Streams.WiredStream.GetResponse, partition: PartitionSuggestion) => {
    value: string | undefined;
    loading: boolean;
};
