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
}

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private constructor(
    private readonly capabilities: FleetCapabilities,
    private readonly logger: Logger,
    private readonly ecsFieldsRepository: EcsFieldsRepository,
    private readonly metadataFieldsRepository: MetadataFieldsRepository,
    private readonly integrationFieldsRepository: IntegrationFieldsRepository,
    private readonly otelFieldsRepository: OtelFieldsRepository
  ) {}

  async getByName<TFieldName extends FieldName>(
    fieldName: TFieldName,
    { integration, dataset, source = [] }: GetFieldsMetadataOptions = {}
  ): Promise<FieldMetadata | undefined> {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    const isSourceAllowed = this.makeSourceValidator(source);
    const { prefix } = extractPrefixParts(fieldName);

    let field: FieldMetadata | undefined;

    // 1. Try resolving from metadata-fields static metadata (highest priority)
    if (isSourceAllowed('metadata')) {
      field = this.metadataFieldsRepository.getByName(fieldName);
    }

    // 2. For prefixed fields (attributes.* or resource.attributes.*),
    //    prioritize OpenTelemetry over ECS to avoid conflicts with namespaced ECS fields
    if (!field && prefix && isSourceAllowed('otel')) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 3. Try resolving from ECS static metadata (authoritative schema for non-prefixed fields)
    if (!field && isSourceAllowed('ecs')) {
      field = this.ecsFieldsRepository.getByName(fieldName);
    }

    // 4. For non-prefixed fields, try OpenTelemetry as fallback
    if (!field && !prefix && isSourceAllowed('otel')) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 5. Try searching for the field in the Elastic Package Registry (integration-specific)
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
       */
      return FieldsMetadataDictionary.create({
        ...(isSourceAllowed('otel') && this.otelFieldsRepository.find().getFields()),
        ...(isSourceAllowed('ecs') && this.ecsFieldsRepository.find().getFields()),
        ...(isSourceAllowed('metadata') && this.metadataFieldsRepository.find().getFields()),
      });
    }

    const fields: Record<string, FieldMetadata> = {};
    for (const fieldName of fieldNames) {
      const field = await this.getByName(fieldName, { integration, dataset, source });

      if (field) {
        fields[fieldName] = field;
      }
    }

    return FieldsMetadataDictionary.create(fields);
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
  }: FieldsMetadataClientDeps) {
    return new FieldsMetadataClient(
      capabilities,
      logger,
      ecsFieldsRepository,
      metadataFieldsRepository,
      integrationFieldsRepository,
      otelFieldsRepository
    );
  }
}
