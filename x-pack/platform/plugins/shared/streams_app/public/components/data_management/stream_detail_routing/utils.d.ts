import { type Condition } from '@kbn/streamlang';
import type { RoutingDefinition, Streams } from '@kbn/streams-schema';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { RoutingDefinitionWithUIAttributes } from './types';
export declare const routingConverter: {
    toAPIDefinition: (routingDefinitionWithAttributes: RoutingDefinitionWithUIAttributes) => RoutingDefinition;
    toUIDefinition: <TRoutingDefinition extends RoutingDefinition>(routingDefinition: TRoutingDefinition) => RoutingDefinitionWithUIAttributes;
};
export declare const processCondition: (condition?: Condition) => Condition | undefined;
export declare const toDataTableRecordWithIndex: <T>(documents: T[]) => {
    raw: T;
    flattened: T;
    index: number;
    id: string;
}[];
export declare const buildRoutingSaveRequestPayload: (definition: Streams.WiredStream.GetResponse, routing: RoutingDefinition[]) => {
    ingest: IngestUpsertRequest;
};
export declare const buildRoutingForkRequestPayload: (rule: RoutingDefinition) => {
    where: Condition;
    status: "enabled" | "disabled" | undefined;
    stream: {
        name: string;
    };
};
