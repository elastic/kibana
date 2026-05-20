import type { IngestBaseStream } from './base';
import type { IngestBase, IngestBaseUpsertRequest } from './base';
import type { ClassicIngestStreamEffectiveLifecycle } from './lifecycle';
import type { ElasticsearchAssets } from './common';
import type { Validation } from '../validation/validation';
import type { BaseStream } from '../base';
import type { IngestStreamSettings } from './settings';
import type { ClassicFieldDefinition } from '../../fields';
import type { EffectiveFailureStore } from './failure_store';
export interface IngestClassic {
    classic: {
        field_overrides?: ClassicFieldDefinition;
    };
}
export type ClassicIngest = IngestBase & IngestClassic;
export declare const ClassicIngest: Validation<IngestBase, ClassicIngest>;
export type ClassicIngestUpsertRequest = IngestBaseUpsertRequest & IngestClassic;
export declare const ClassicIngestUpsertRequest: Validation<IngestBaseUpsertRequest, ClassicIngestUpsertRequest>;
type OmitClassicStreamUpsertProps<T extends {
    ingest: Omit<ClassicIngest, 'processing'> & {
        processing: Omit<ClassicIngest['processing'], 'updated_at'> & {
            updated_at?: string;
        };
    };
}> = Omit<T, 'ingest'> & {
    ingest: Omit<ClassicIngest, 'processing'> & {
        processing: Omit<ClassicIngest['processing'], 'updated_at'> & {
            updated_at?: never;
        };
    };
};
export declare namespace ClassicStream {
    interface Definition extends IngestBaseStream.Definition {
        type: 'classic';
        ingest: ClassicIngest;
    }
    type Source = IngestBaseStream.Source<ClassicStream.Definition>;
    interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
        elasticsearch_assets?: ElasticsearchAssets;
        data_stream_exists: boolean;
        effective_lifecycle: ClassicIngestStreamEffectiveLifecycle;
        effective_failure_store: EffectiveFailureStore;
        effective_settings: IngestStreamSettings;
    }
    type UpsertRequest = IngestBaseStream.UpsertRequest<OmitClassicStreamUpsertProps<Definition>>;
    interface Model {
        Definition: ClassicStream.Definition;
        Source: ClassicStream.Source;
        GetResponse: ClassicStream.GetResponse;
        UpsertRequest: ClassicStream.UpsertRequest;
    }
}
export declare const ClassicStream: {
    Definition: Validation<BaseStream.Model['Definition'], ClassicStream.Definition>;
    Source: Validation<BaseStream.Model['Definition'], ClassicStream.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], ClassicStream.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], ClassicStream.UpsertRequest>;
};
export {};
