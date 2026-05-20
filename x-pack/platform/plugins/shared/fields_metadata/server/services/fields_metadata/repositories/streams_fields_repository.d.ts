import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import type { AnyFieldName } from '../../../../common';
import type { ExtractedStreamFields, StreamsFieldsSearchParams } from './types';
type BoundStreamsFieldsExtractor = (params: StreamsFieldsSearchParams) => Promise<ExtractedStreamFields>;
interface StreamsFieldsRepositoryDeps {
    streamsFieldsExtractor: BoundStreamsFieldsExtractor;
}
export declare class StreamsFieldsRepository {
    private readonly streamsFieldsExtractor;
    private cache;
    private constructor();
    getByName(fieldName: AnyFieldName, params: Partial<StreamsFieldsSearchParams>): Promise<FieldMetadata | undefined>;
    static create({ streamsFieldsExtractor }: StreamsFieldsRepositoryDeps): StreamsFieldsRepository;
    private extractFields;
    private getCachedField;
    private storeFieldsInCache;
    private mapExtractedFieldsToFieldMetadata;
}
export {};
