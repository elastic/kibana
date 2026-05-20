import type { BaseStream } from '../base';
import { IngestBase, IngestBaseUpsertRequest } from './base';
import type { Validation } from '../validation/validation';
import { ClassicIngest, ClassicIngestUpsertRequest, ClassicStream } from './classic';
import { WiredIngest, WiredIngestUpsertRequest, WiredStream } from './wired';
export declare namespace IngestStream {
    namespace all {
        type UpsertRequest = WiredStream.UpsertRequest | ClassicStream.UpsertRequest;
        type Source = WiredStream.Source | ClassicStream.Source;
        type Definition = WiredStream.Definition | ClassicStream.Definition;
        type GetResponse = WiredStream.GetResponse | ClassicStream.GetResponse;
        type Model = WiredStream.Model | ClassicStream.Model;
    }
    const all: {
        Definition: Validation<BaseStream.Model['Definition'], IngestStream.all.Definition>;
        Source: Validation<BaseStream.Model['Definition'], IngestStream.all.Source>;
        GetResponse: Validation<BaseStream.Model['GetResponse'], IngestStream.all.GetResponse>;
        UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], IngestStream.all.UpsertRequest>;
    };
}
export type Ingest = WiredIngest | ClassicIngest;
export declare const Ingest: Validation<IngestBase, Ingest>;
export type IngestUpsertRequest = WiredIngestUpsertRequest | ClassicIngestUpsertRequest;
export declare const IngestUpsertRequest: Validation<IngestBaseUpsertRequest, IngestUpsertRequest>;
