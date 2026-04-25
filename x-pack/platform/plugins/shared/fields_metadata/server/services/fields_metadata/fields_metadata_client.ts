/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import type { FieldMetadata } from '../../../common/fields_metadata/models/field_metadata';
import { FieldsMetadataDictionary } from '../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { FieldName, FieldSource } from '../../../common';
import { extractPrefixParts } from '../../../common/fields_metadata/utils/create_proxied_fields_map';

import type { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import type { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import type { MetadataFieldsRepository } from './repositories/metadata_fields_repository';
import type { OtelFieldsRepository } from './repositories/otel_fields_repository';
import type {
  FindFieldsMetadataOptions,
  GetFieldsMetadataOptions,
  IFieldsMetadataClient,
} from './types';
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

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private constructor(
    private readonly capabilities: FleetCapabilities,
    private readonly logger: Logger,
    private readonly ecsFieldsRepository: EcsFieldsRepository,
    private readonly metadataFieldsRepository: MetadataFieldsRepository,
    private readonly integrationFieldsRepository: IntegrationFieldsRepository,
    private readonly otelFieldsRepository: OtelFieldsRepository,
    private readonly streamsFieldsRepository: StreamsFieldsRepository
  ) {}

  async getByName<TFieldName extends FieldName>(
    fieldName: TFieldName,
    { integration, dataset, source = [], streamName }: GetFieldsMetadataOptions = {}
  ): Promise<FieldMetadata | undefined> {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    const isSourceAllowed = this.makeSourceValidator(source);
    const { prefix } = extractPrefixParts(fieldName);

    let field: FieldMetadata | undefined;

    // 1. Try resolving from streams (highest priority when streamName is provided)
    if (isSourceAllowed('streams') && streamName) {
      field = await this.streamsFieldsRepository.getByName(fieldName, { streamName });
    }

    // 2. Try resolving from metadata-fields static metadata
    if (!field && isSourceAllowed('metadata')) {
      field = this.metadataFieldsRepository.getByName(fieldName);
    }

    // 3. For prefixed fields (attributes.* or resource.attributes.*),
    //    prioritize OpenTelemetry over ECS to avoid conflicts with namespaced ECS fields
    if (!field && prefix && isSourceAllowed('otel')) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 4. Try resolving from ECS static metadata (authoritative schema for non-prefixed fields)
    if (!field && isSourceAllowed('ecs')) {
      field = this.ecsFieldsRepository.getByName(fieldName);
    }

    // 5. For non-prefixed fields, try OpenTelemetry as fallback
    if (!field && !prefix && isSourceAllowed('otel')) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 6. Try searching for the field in the Elastic Package Registry (integration-specific)
    if (!field && isSourceAllowed('integration') && this.hasFleetPermissions(this.capabilities)) {
      field = await this.integrationFieldsRepository.getByName(fieldName, {
        integration,
        dataset,
      });
    }

    return field;
  }

  async find({
    fieldNames,
    integration,
    dataset,
    source = [],
    streamName,
  }: FindFieldsMetadataOptions = {}): Promise<FieldsMetadataDictionary> {
    const isSourceAllowed = this.makeSourceValidator(source);

    if (!fieldNames) {
      /**
       * The merge order is important here.
       * The metadata fields repository has the highest priority,
       * followed by the ECS fields repository for base fields,
       * followed by the OpenTel fields repository for base fields.
       *
       * Note: For prefixed fields (attributes.* and resource.attributes.*),
       * OpenTelemetry takes priority over ECS when using getByName() to avoid
       * conflicts with namespaced ECS fields. However, when returning all fields,
       * we merge in this order to ensure ECS base fields are preferred, and the
       * proxy will generate prefixed variants as needed.
       *
       * Stream fields are not included in the find() without fieldNames since
       * we don't want to load all stream fields by default - they require a
       * specific stream context.
       */
      return FieldsMetadataDictionary.create({
        ...(isSourceAllowed('otel') && this.otelFieldsRepository.find().getFields()),
        ...(isSourceAllowed('ecs') && this.ecsFieldsRepository.find().getFields()),
        ...(isSourceAllowed('metadata') && this.metadataFieldsRepository.find().getFields()),
      });
    }

    const fields: Record<string, FieldMetadata> = {};
    for (const fieldName of fieldNames) {
      const field = await this.getByName(fieldName, { integration, dataset, source, streamName });

      if (field) {
        fields[fieldName] = field;
      }
    }

    return FieldsMetadataDictionary.create(fields);
  }

  /**
   * Checks if any of the expected types are included in the allowed values for the event category.
   */
  async matchesAnyTypeForEventCategory(
    categories: string[],
    expectedTypes: string[]
  ): Promise<boolean> {
    const eventCategoryField = await this.getByName('event.category', { source: ['ecs'] });
    if (!eventCategoryField || !eventCategoryField.allowed_values) {
      return false;
    }

    return expectedTypes.some((expectedType) => {
      return categories.some((category) => {
        return (
          eventCategoryField.allowed_values
            ?.find((allowedValue) => allowedValue.name === category)
            ?.expected_event_types?.includes(expectedType) ?? false
        );
      });
    });
  }

  /**
   * Returns immediate child fields of `fieldName` (one extra dot segment only).
   * e.g. for `host`, includes `host.name` but not `host.name.grandchild`.
   */
  async getFieldChildren(
    fieldName: FieldName,
    { source = [] }: GetFieldsMetadataOptions = {}
  ): Promise<FieldsMetadataDictionary> {
    const fullDictionary = await this.find({ source });
    const allFields = fullDictionary.getFields();
    const children: Record<string, FieldMetadata> = {};

    for (const [key, field] of Object.entries(allFields)) {
      if (isDirectChildFieldName(fieldName, key)) {
        children[key] = field;
      }
    }

    return FieldsMetadataDictionary.create(children);
  }

  /**
   * Lists distinct root ECS field set names from the static ECS schema (e.g. `agent`, `host`, `event`, and `base` for root-level fields such as `@timestamp` / `message`).
   * @see https://www.elastic.co/docs/reference/ecs/ecs-field-reference
   */
  async getECSFieldsets(): Promise<string[]> {
    const ecsFields = this.ecsFieldsRepository.find().getFields();
    const fieldsets = new Set<string>();

    for (const field of Object.values(ecsFields)) {
      const flatName = field.flat_name ?? field.name;
      fieldsets.add(ecsFlatNameToRootFieldsetName(flatName));
    }

    return [...fieldsets].sort((a, b) => a.localeCompare(b));
  }

  private hasFleetPermissions(capabilities: FleetCapabilities) {
    const { fleet, fleetv2 } = capabilities;

    return fleet.read && fleetv2.read;
  }

  private makeSourceValidator =
    (sourceList: FieldSource | FieldSource[]) => (source: FieldSource) => {
      const sources = Array.isArray(sourceList) ? sourceList : [sourceList];
      // When `source` filter is not provided, all sources are allowed
      return isEmpty(sources) ? true : sources.includes(source);
    };

  public static create({
    capabilities,
    logger,
    ecsFieldsRepository,
    metadataFieldsRepository,
    integrationFieldsRepository,
    otelFieldsRepository,
    streamsFieldsRepository,
  }: FieldsMetadataClientDeps) {
    return new FieldsMetadataClient(
      capabilities,
      logger,
      ecsFieldsRepository,
      metadataFieldsRepository,
      integrationFieldsRepository,
      otelFieldsRepository,
      streamsFieldsRepository
    );
  }
}

/** True if `fieldKey` is exactly one segment below `parentFieldName` (e.g. `host.name` under `host`). */
export function isDirectChildFieldName(parentFieldName: string, fieldKey: string): boolean {
  const prefix = `${parentFieldName}.`;
  if (!fieldKey.startsWith(prefix)) {
    return false;
  }
  const remainder = fieldKey.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('.');
}

/**
 * Maps an ECS `flat_name` to its root field set: the segment before the first `.`, or `base` for
 * fields defined at the root of the event (no dots), per the ECS field reference.
 */
export function ecsFlatNameToRootFieldsetName(flatName: string): string {
  const dot = flatName.indexOf('.');
  if (dot === -1) {
    return 'base';
  }
  return flatName.slice(0, dot);
}
