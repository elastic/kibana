import type { Capabilities, Logger } from '@kbn/core/server';
import type { FieldMetadata } from '../../../common/fields_metadata/models/field_metadata';
import { FieldsMetadataDictionary } from '../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { FieldName } from '../../../common';
import type { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import type { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import type { MetadataFieldsRepository } from './repositories/metadata_fields_repository';
import type { OtelFieldsRepository } from './repositories/otel_fields_repository';
import type { FindFieldsMetadataOptions, GetFieldsMetadataOptions, IFieldsMetadataClient } from './types';
import type { StreamsFieldsRepository } from './repositories/streams_fields_repository';
interface FleetCapabilities {
    fleet: Capabilities[string];
    fleetv2: Capabilities[string];
}
interface FieldsMetadataClientDeps {
    capabilities: FleetCapabilities;
    logger: Logger;
    ecsFieldsRepository: EcsFieldsRepository;
    metadataFieldsRepository: MetadataFieldsRepository;
    integrationFieldsRepository: IntegrationFieldsRepository;
    otelFieldsRepository: OtelFieldsRepository;
    streamsFieldsRepository: StreamsFieldsRepository;
}
export declare class FieldsMetadataClient implements IFieldsMetadataClient {
    private readonly capabilities;
    private readonly logger;
    private readonly ecsFieldsRepository;
    private readonly metadataFieldsRepository;
    private readonly integrationFieldsRepository;
    private readonly otelFieldsRepository;
    private readonly streamsFieldsRepository;
    private constructor();
    getByName<TFieldName extends FieldName>(fieldName: TFieldName, { integration, dataset, source, streamName }?: GetFieldsMetadataOptions): Promise<FieldMetadata | undefined>;
    find({ fieldNames, integration, dataset, source, streamName, }?: FindFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
    /**
     * Checks if any of the expected types are included in the allowed values for the event category.
     */
    matchesAnyTypeForEventCategory(categories: string[], expectedTypes: string[]): Promise<boolean>;
    /**
     * Returns immediate child fields of `fieldName` (one extra dot segment only).
     * e.g. for `host`, includes `host.name` but not `host.name.grandchild`.
     */
    getFieldChildren(fieldName: FieldName, { source }?: GetFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
    /**
     * Lists distinct root ECS field set names from the static ECS schema (e.g. `agent`, `host`, `event`, and `base` for root-level fields such as `@timestamp` / `message`).
     * @see https://www.elastic.co/docs/reference/ecs/ecs-field-reference
     */
    getECSFieldsets(): Promise<string[]>;
    private hasFleetPermissions;
    private makeSourceValidator;
    static create({ capabilities, logger, ecsFieldsRepository, metadataFieldsRepository, integrationFieldsRepository, otelFieldsRepository, streamsFieldsRepository, }: FieldsMetadataClientDeps): FieldsMetadataClient;
}
/** True if `fieldKey` is exactly one segment below `parentFieldName` (e.g. `host.name` under `host`). */
export declare function isDirectChildFieldName(parentFieldName: string, fieldKey: string): boolean;
/**
 * Maps an ECS `flat_name` to its root field set: the segment before the first `.`, or `base` for
 * fields defined at the root of the event (no dots), per the ECS field reference.
 */
export declare function ecsFlatNameToRootFieldsetName(flatName: string): string;
export {};
