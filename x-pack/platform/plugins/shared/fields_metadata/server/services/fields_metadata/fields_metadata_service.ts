/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat as ecsFields } from '@elastic/ecs';
import { CoreStart, Logger } from '@kbn/core/server';
import { FieldsMetadataClient } from './fields_metadata_client';
import { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import { MetadataFieldsRepository } from './repositories/metadata_fields_repository';
import { IntegrationFieldsExtractor, IntegrationListExtractor } from './repositories/types';
import { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';
import { MetadataFields as metadataFields } from '../../../common/metadata_fields';

export class FieldsMetadataService {
  private integrationFieldsExtractor: IntegrationFieldsExtractor = () => Promise.resolve({});
  private integrationListExtractor: IntegrationListExtractor = () => Promise.resolve([]);

  constructor(private readonly logger: Logger) {}

  public setup(): FieldsMetadataServiceSetup {
    return {
      registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => {
        this.integrationFieldsExtractor = extractor;
      },
      registerIntegrationListExtractor: (extractor: IntegrationListExtractor) => {
        this.integrationListExtractor = extractor;
      },
    };
  }

  public start(core: CoreStart): FieldsMetadataServiceStart {
    const { logger, integrationFieldsExtractor, integrationListExtractor } = this;

    const ecsFieldsRepository = EcsFieldsRepository.create({ ecsFields });
    const metadataFieldsRepository = MetadataFieldsRepository.create({ metadataFields });
    const integrationFieldsRepository = IntegrationFieldsRepository.create({
      integrationFieldsExtractor,
      integrationListExtractor,
    });

    return {
      getClient: async (request) => {
        const { fleet, fleetv2 } = await core.capabilities.resolveCapabilities(request, {
          capabilityPath: '*',
        });

        return FieldsMetadataClient.create({
          capabilities: { fleet, fleetv2 },
          logger,
          ecsFieldsRepository,
          metadataFieldsRepository,
          integrationFieldsRepository,
        });
      },
    };
  }
}
