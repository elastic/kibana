import type { IngestBaseStream } from './base';
import type { IngestBase, IngestBaseUpsertRequest } from './base';
import type { RoutingDefinition } from './routing';
import type { WiredIngestStreamEffectiveLifecycle } from './lifecycle';
import type { FieldDefinition, InheritedFieldDefinition } from '../../fields';
import type { Validation } from '../validation/validation';
import type { BaseStream } from '../base';
import type { WiredIngestStreamEffectiveSettings } from './settings';
import type { WiredIngestStreamEffectiveFailureStore } from './failure_store';
interface IngestWired {
    wired: {
        fields: FieldDefinition;
        routing: RoutingDefinition[];
        draft?: boolean;
    };
}
export type WiredIngest = IngestBase & IngestWired;
export declare const WiredIngest: Validation<IngestBase, WiredIngest>;
export type WiredIngestUpsertRequest = IngestBaseUpsertRequest & IngestWired;
export declare const WiredIngestUpsertRequest: Validation<IngestBaseUpsertRequest, WiredIngestUpsertRequest>;
type OmitWiredStreamUpsertProps<T extends {
    ingest: Omit<WiredIngest, 'processing'> & {
        processing: Omit<WiredIngest['processing'], 'updated_at'> & {
            updated_at?: string;
        };
    };
}> = Omit<T, 'ingest'> & {
    ingest: Omit<WiredIngest, 'processing'> & {
        processing: Omit<WiredIngest['processing'], 'updated_at'> & {
            updated_at?: never;
        };
    };
};
export declare namespace WiredStream {
    interface Model {
        Definition: WiredStream.Definition;
        Source: WiredStream.Source;
        GetResponse: WiredStream.GetResponse;
        UpsertRequest: WiredStream.UpsertRequest;
    }
    interface Definition extends IngestBaseStream.Definition {
        type: 'wired';
        ingest: WiredIngest;
    }
    type Source = IngestBaseStream.Source<WiredStream.Definition>;
    interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
        /**
         * Whether the backing data stream exists in Elasticsearch.
         *
         * Note: when the caller lacks `view_index_metadata`, this will be `false`
         * (consistent with classic streams).
         */
        data_stream_exists: boolean;
        inherited_fields: InheritedFieldDefinition;
        effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
        effective_settings: WiredIngestStreamEffectiveSettings;
        effective_failure_store: WiredIngestStreamEffectiveFailureStore;
    }
    type UpsertRequest = IngestBaseStream.UpsertRequest<OmitWiredStreamUpsertProps<Definition>>;
}
export declare const WiredStream: {
    Definition: Validation<BaseStream.Model['Definition'], WiredStream.Definition>;
    Source: Validation<BaseStream.Model['Definition'], WiredStream.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], WiredStream.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], WiredStream.UpsertRequest>;
};
/**
 * A wired stream definition where `draft` is narrowed to `true`.
 */
export type DraftStreamDefinition = WiredStream.Definition & {
    ingest: {
        wired: {
            draft: true;
        };
    };
};
/**
 * Type guard that checks whether a stream definition is a draft wired stream.
 */
export declare function isDraftStream(definition: BaseStream.Model['Definition']): definition is DraftStreamDefinition;
/**
 * Checks whether a GetResponse represents a draft wired stream.
 */
export declare function isDraftGetResponse(response: BaseStream.Model['GetResponse']): response is WiredStream.GetResponse;
export {};
