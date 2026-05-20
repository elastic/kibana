import type { Condition } from '@kbn/streamlang';
import type { z } from '@kbn/zod/v4';
export declare const routingStatus: z.ZodEnum<{
    disabled: "disabled";
    enabled: "enabled";
}>;
export type RoutingStatus = z.infer<typeof routingStatus>;
export interface RoutingDefinition {
    destination: string;
    where: Condition;
    status?: RoutingStatus;
    draft?: boolean;
}
export declare const routingDefinitionSchema: z.Schema<RoutingDefinition>;
export declare const routingDefinitionListSchema: z.Schema<RoutingDefinition[]>;
export declare const isRoutingEnabled: <TValue extends "disabled" | "enabled">(value: TValue) => value is Extract<TValue, "enabled">;
