/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import { Legacy } from 'kibana';

import { Pick3 } from '../../../common/utility_types';
import { InfraConfigurationAdapter } from '../adapters/configuration';
import { InfraFrameworkRequest, internalInfraFrameworkRequest } from '../adapters/framework';
import { defaultSourceConfiguration } from './defaults';
import { NotFoundError } from './errors';
import { infraSourceConfigurationSavedObjectType } from './saved_object_mappings';
import {
  InfraSavedSourceConfiguration,
  InfraSourceConfiguration,
  InfraStaticSourceConfiguration,
  pickSavedSourceConfiguration,
  SourceConfigurationSavedObjectRuntimeType,
  StaticSourceConfigurationRuntimeType,
} from './types';

export class InfraSources {
  private internalSourceConfigurations: Map<string, InfraStaticSourceConfiguration> = new Map();

  constructor(
    private readonly libs: {
      configuration: InfraConfigurationAdapter;
      savedObjects: Pick<Legacy.SavedObjectsService, 'getScopedSavedObjectsClient'> &
        Pick3<Legacy.SavedObjectsService, 'SavedObjectsClient', 'errors', 'isNotFoundError'>;
    }
  ) {}

  public async getSourceConfiguration(request: InfraFrameworkRequest, sourceId: string) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const savedSourceConfiguration = await this.getInternalSourceConfiguration(sourceId)
      .then(internalSourceConfiguration => ({
        id: sourceId,
        version: undefined,
        updatedAt: undefined,
        origin: 'internal' as 'internal',
        configuration: mergeSourceConfiguration(
          staticDefaultSourceConfiguration,
          internalSourceConfiguration
        ),
      }))
      .catch(err =>
        err instanceof NotFoundError
          ? this.getSavedSourceConfiguration(request, sourceId).then(result => ({
              ...result,
              configuration: mergeSourceConfiguration(
                staticDefaultSourceConfiguration,
                result.configuration
              ),
            }))
          : Promise.reject(err)
      )
      .catch(err =>
        this.libs.savedObjects.SavedObjectsClient.errors.isNotFoundError(err)
          ? Promise.resolve({
              id: sourceId,
              version: undefined,
              updatedAt: undefined,
              origin: 'fallback' as 'fallback',
              configuration: staticDefaultSourceConfiguration,
            })
          : Promise.reject(err)
      );

    return savedSourceConfiguration;
  }

  public async getAllSourceConfigurations(request: InfraFrameworkRequest) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const savedSourceConfigurations = await this.getAllSavedSourceConfigurations(request);

    return savedSourceConfigurations.map(savedSourceConfiguration => ({
      ...savedSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        savedSourceConfiguration.configuration
      ),
    }));
  }

  public async createSourceConfiguration(
    request: InfraFrameworkRequest,
    sourceId: string,
    source: InfraSavedSourceConfiguration
  ) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const newSourceConfiguration = mergeSourceConfiguration(
      staticDefaultSourceConfiguration,
      source
    );

    const createdSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await this.libs.savedObjects
        .getScopedSavedObjectsClient(request[internalInfraFrameworkRequest])
        .create(
          infraSourceConfigurationSavedObjectType,
          pickSavedSourceConfiguration(newSourceConfiguration) as any,
          { id: sourceId }
        )
    );

    return {
      ...createdSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        createdSourceConfiguration.configuration
      ),
    };
  }

  public async deleteSourceConfiguration(request: InfraFrameworkRequest, sourceId: string) {
    await this.libs.savedObjects
      .getScopedSavedObjectsClient(request[internalInfraFrameworkRequest])
      .delete(infraSourceConfigurationSavedObjectType, sourceId);
  }

  public async updateSourceConfiguration(
    request: InfraFrameworkRequest,
    sourceId: string,
    sourceProperties: InfraSavedSourceConfiguration
  ) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const { configuration, version } = await this.getSourceConfiguration(request, sourceId);

    const updatedSourceConfigurationAttributes = mergeSourceConfiguration(
      configuration,
      sourceProperties
    );

    const updatedSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await this.libs.savedObjects
        .getScopedSavedObjectsClient(request[internalInfraFrameworkRequest])
        .update(
          infraSourceConfigurationSavedObjectType,
          sourceId,
          pickSavedSourceConfiguration(updatedSourceConfigurationAttributes) as any,
          {
            version,
          }
        )
    );

    return {
      ...updatedSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        updatedSourceConfiguration.configuration
      ),
    };
  }

  public async defineInternalSourceConfiguration(
    sourceId: string,
    sourceProperties: InfraStaticSourceConfiguration
  ) {
    this.internalSourceConfigurations.set(sourceId, sourceProperties);
  }

  public async getInternalSourceConfiguration(sourceId: string) {
    const internalSourceConfiguration = this.internalSourceConfigurations.get(sourceId);

    if (!internalSourceConfiguration) {
      throw new NotFoundError(
        `Failed to load internal source configuration: no configuration "${sourceId}" found.`
      );
    }

    return internalSourceConfiguration;
  }

  private async getStaticDefaultSourceConfiguration() {
    const staticConfiguration = await this.libs.configuration.get();
    const staticSourceConfiguration = runtimeTypes
      .type({
        sources: runtimeTypes.type({
          default: StaticSourceConfigurationRuntimeType,
        }),
      })
      .decode(staticConfiguration)
      .map(({ sources: { default: defaultConfiguration } }) => defaultConfiguration)
      .getOrElse({});

    return mergeSourceConfiguration(defaultSourceConfiguration, staticSourceConfiguration);
  }

  private async getSavedSourceConfiguration(request: InfraFrameworkRequest, sourceId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalInfraFrameworkRequest]
    );

    const savedObject = await savedObjectsClient.get(
      infraSourceConfigurationSavedObjectType,
      sourceId
    );

    return convertSavedObjectToSavedSourceConfiguration(savedObject);
  }

  private async getAllSavedSourceConfigurations(request: InfraFrameworkRequest) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalInfraFrameworkRequest]
    );

    const savedObjects = await savedObjectsClient.find({
      type: infraSourceConfigurationSavedObjectType,
    });

    return savedObjects.saved_objects.map(convertSavedObjectToSavedSourceConfiguration);
  }
}

const mergeSourceConfiguration = (
  first: InfraSourceConfiguration,
  ...others: InfraStaticSourceConfiguration[]
) =>
  others.reduce<InfraSourceConfiguration>(
    (previousSourceConfiguration, currentSourceConfiguration) => ({
      ...previousSourceConfiguration,
      ...currentSourceConfiguration,
      fields: {
        ...previousSourceConfiguration.fields,
        ...currentSourceConfiguration.fields,
      },
    }),
    first
  );

const convertSavedObjectToSavedSourceConfiguration = (savedObject: unknown) =>
  SourceConfigurationSavedObjectRuntimeType.decode(savedObject)
    .map(savedSourceConfiguration => ({
      id: savedSourceConfiguration.id,
      version: savedSourceConfiguration.version,
      updatedAt: savedSourceConfiguration.updated_at,
      origin: 'stored' as 'stored',
      configuration: savedSourceConfiguration.attributes,
    }))
    .getOrElseL(errors => {
      throw new Error(failure(errors).join('\n'));
    });
