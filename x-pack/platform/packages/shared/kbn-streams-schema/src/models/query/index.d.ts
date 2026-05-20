import type { BaseStream } from '../base';
import type { Validation } from '../validation/validation';
import type { InheritedFieldDefinition } from '../../fields';
/**
 * Query definition stored in the stream schema.
 * References an ES|QL view by name - the view is the source of truth for the actual query.
 */
export interface Query {
    view: string;
}
export interface QueryWithEsql extends Query {
    esql: string;
}
export declare const Query: Validation<unknown, Query>;
export declare const QueryWithEsql: Validation<unknown, QueryWithEsql>;
export declare namespace QueryStream {
    interface Model {
        Definition: QueryStream.Definition;
        Source: QueryStream.Source;
        GetResponse: QueryStream.GetResponse;
        UpsertRequest: QueryStream.UpsertRequest;
    }
    interface Definition extends BaseStream.Definition {
        type: 'query';
        query: QueryWithEsql;
        field_descriptions?: Record<string, string>;
    }
    type Source = BaseStream.Source<QueryStream.Definition>;
    interface GetResponse extends BaseStream.GetResponse<Definition> {
        stream: Definition;
        inherited_fields: InheritedFieldDefinition;
    }
    interface UpsertRequest extends BaseStream.UpsertRequest<Definition> {
        stream: Omit<BaseStream.UpsertRequest<Definition>['stream'], 'query'> & {
            query: QueryWithEsql;
        };
    }
}
export declare const QueryStream: {
    Definition: Validation<BaseStream.Model['Definition'], QueryStream.Definition>;
    Source: Validation<BaseStream.Model['Definition'], QueryStream.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], QueryStream.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], QueryStream.UpsertRequest>;
};
