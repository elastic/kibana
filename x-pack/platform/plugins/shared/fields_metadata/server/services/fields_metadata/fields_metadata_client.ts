/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import type { FieldName, FieldMetadata, FieldSource } from '../../../common';
import { FieldsMetadataDictionary } from '../../../common';
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

    let field: FieldMetadata | undefined;

    // 1. Try resolving from metadata-fields static metadata (highest priority)
    if (isSourceAllowed('metadata')) {
      field = this.metadataFieldsRepository.getByName(fieldName);
    }

    // 2. Try resolving from ECS static metadata (authoritative schema)
    if (!field && isSourceAllowed('ecs')) {
      field = this.ecsFieldsRepository.getByName(fieldName);
    }

    // 3. Try resolving from OpenTelemetry semantic conventions (fallback)
    if (!field && isSourceAllowed('otel')) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 4. Try searching for the field in the Elastic Package Registry (integration-specific)
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
       * followed by the ECS fields repository,
       * followed by the OpenTel fields repository.
       *
       * This is because we want the ECS fields repository to be more authoritative than the OpenTel fields repository.
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
