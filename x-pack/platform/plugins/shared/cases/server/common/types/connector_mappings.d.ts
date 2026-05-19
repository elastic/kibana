import * as rt from 'io-ts';
import type { SavedObject } from '@kbn/core/server';
import type { ConnectorMappingsAttributes } from '../../../common/types/domain';
export interface ConnectorMappingsPersistedAttributes {
    mappings: Array<{
        action_type: string;
        source: string;
        target: string;
    }>;
    owner: string;
}
export declare const ConnectorMappingsAttributesTransformedRt: rt.ExactC<rt.TypeC<{
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
    owner: rt.StringC;
}>>;
export type ConnectorMappingsAttributesTransformed = ConnectorMappingsAttributes;
export type ConnectorMappingsSavedObjectTransformed = SavedObject<ConnectorMappingsAttributesTransformed>;
export declare const ConnectorMappingsAttributesPartialRt: rt.ExactC<rt.PartialC<{
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
    owner: rt.StringC;
}>>;
