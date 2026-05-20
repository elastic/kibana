import { z } from '@kbn/zod/v4';
import type { Validation } from './validation/validation';
import type { BaseStream } from './base';
import { IngestStream } from './ingest';
import { ClassicStream as nClassicStream } from './ingest/classic';
import { WiredStream as nWiredStream } from './ingest/wired';
import { QueryStream as nQueryStream } from './query';
export declare namespace Streams {
    export import ingest = IngestStream;
    export import WiredStream = nWiredStream;
    export import ClassicStream = nClassicStream;
    export import QueryStream = nQueryStream;
    namespace all {
        type Model = ingest.all.Model | QueryStream.Model;
        type Source = ingest.all.Source | QueryStream.Source;
        type Definition = ingest.all.Definition | QueryStream.Definition;
        type GetResponse = ingest.all.GetResponse | QueryStream.GetResponse;
        type UpsertRequest = ingest.all.UpsertRequest | QueryStream.UpsertRequest;
    }
    const all: {
        Definition: Validation<BaseStream.Model['Definition'], all.Definition>;
        Source: Validation<BaseStream.Model['Definition'], all.Source>;
        GetResponse: Validation<BaseStream.Model['GetResponse'], all.GetResponse>;
        UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], all.UpsertRequest>;
    };
}
/**
 * Union of all three stream definition schemas, discriminated by the `type`
 * literal field. Registered as a named OAS component (`StreamDefinition`) with
 * a `discriminator` extension so code generators can produce properly typed
 * sealed-class / tagged-union structs.
 */
export declare const streamDefinitionSchema: z.ZodUnion<readonly [z.ZodType<nWiredStream.Definition, unknown, z.core.$ZodTypeInternals<nWiredStream.Definition, unknown>>, z.ZodType<nClassicStream.Definition, unknown, z.core.$ZodTypeInternals<nClassicStream.Definition, unknown>>, z.ZodType<nQueryStream.Definition, unknown, z.core.$ZodTypeInternals<nQueryStream.Definition, unknown>>]>;
