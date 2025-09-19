/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, Logger } from '@kbn/core/server';
import type { FieldName, FieldMetadata } from '../../../common';
import { FieldsMetadataDictionary } from '../../../common';
import type { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import type { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import type { MetadataFieldsRepository } from './repositories/metadata_fields_repository';
import type { OtelFieldsRepository } from './repositories/otel_fields_repository';
import type { IntegrationFieldsSearchParams } from './repositories/types';
import type { FindFieldsMetadataOptions, IFieldsMetadataClient } from './types';

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
    { integration, dataset }: Partial<IntegrationFieldsSearchParams> = {}
  ): Promise<FieldMetadata | undefined> {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    // 1. Try resolving from metadata-fields static metadata (highest priority)
    let field = this.metadataFieldsRepository.getByName(fieldName);

    // 2. Try resolving from ECS static metadata (authoritative schema)
    if (!field) {
      field = this.ecsFieldsRepository.getByName(fieldName);
    }

    // 3. Try resolving from OpenTelemetry semantic conventions (fallback)
    if (!field) {
      field = this.otelFieldsRepository.getByName(fieldName);
    }

    // 4. Try searching for the field in the Elastic Package Registry (integration-specific)
    if (!field && this.hasFleetPermissions(this.capabilities)) {
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
  }: FindFieldsMetadataOptions = {}): Promise<FieldsMetadataDictionary> {
    if (!fieldNames) {
      /**
       * The merge order is important here.
       * The ECS fields repository has the highest priority,
       * followed by the OpenTel fields repository,
       * followed by the metadata fields repository.
       *
       * This is because the ECS fields repository is the
       * most authoritative source of field metadata.
       */
      return FieldsMetadataDictionary.create({
        ...this.metadataFieldsRepository.find().getFields(),
        ...this.otelFieldsRepository.find().getFields(),
        ...this.ecsFieldsRepository.find().getFields(),
      });
    }

    const fields: Record<string, FieldMetadata> = {};
    for (const fieldName of fieldNames) {
      const field = await this.getByName(fieldName, { integration, dataset });

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
