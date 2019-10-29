/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import { Legacy } from 'kibana';

import { identity, constant } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { KibanaRequest } from 'src/core/server';
import { Pick3 } from '../../../common/utility_types';
import { InfraFrameworkRequest } from '../adapters/framework';
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
import { InfraConfig } from '../../new_platform_config.schema';

interface Libs {
  config: InfraConfig;
  savedObjects: Pick<Legacy.SavedObjectsService, 'getScopedSavedObjectsClient'> &
    Pick3<Legacy.SavedObjectsService, 'SavedObjectsClient', 'errors', 'isNotFoundError'>;
}

export class InfraSources {
  private internalSourceConfigurations: Map<string, InfraStaticSourceConfiguration> = new Map();
  private readonly libs: Libs;

  constructor(libs: Libs) {
    this.libs = libs;
  }

  public async getSourceConfiguration(request: KibanaRequest, sourceId: string) {
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

  public async getAllSourceConfigurations(request: KibanaRequest) {
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
    request: KibanaRequest,
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
        .getScopedSavedObjectsClient(request)
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
      .getScopedSavedObjectsClient(request)
      .delete(infraSourceConfigurationSavedObjectType, sourceId);
  }

  public async updateSourceConfiguration(
    request: KibanaRequest,
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
        .getScopedSavedObjectsClient(request)
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
    const staticSourceConfiguration = pipe(
      runtimeTypes
        .type({
          sources: runtimeTypes.type({
            default: StaticSourceConfigurationRuntimeType,
          }),
        })
        .decode(this.libs.config),
      map(({ sources: { default: defaultConfiguration } }) => defaultConfiguration),
      fold(constant({}), identity)
    );

    return mergeSourceConfiguration(defaultSourceConfiguration, staticSourceConfiguration);
  }

  private async getSavedSourceConfiguration(request: KibanaRequest, sourceId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(request);

    const savedObject = await savedObjectsClient.get(
      infraSourceConfigurationSavedObjectType,
      sourceId
    );

    return convertSavedObjectToSavedSourceConfiguration(savedObject);
  }

  private async getAllSavedSourceConfigurations(request: KibanaRequest) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(request);

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
  pipe(
    SourceConfigurationSavedObjectRuntimeType.decode(savedObject),
    map(savedSourceConfiguration => ({
      id: savedSourceConfiguration.id,
      version: savedSourceConfiguration.version,
      updatedAt: savedSourceConfiguration.updated_at,
      origin: 'stored' as 'stored',
      configuration: savedSourceConfiguration.attributes,
    })),
    fold(errors => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );
