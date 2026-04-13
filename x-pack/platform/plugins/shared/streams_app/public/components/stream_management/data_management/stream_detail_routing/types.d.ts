import type { RoutingDefinition, RoutingStatus } from '@kbn/streams-schema';
export interface RoutingDefinitionWithUIAttributes extends RoutingDefinition {
    id: string;
    isNew?: boolean;
    status: RoutingStatus;
}
