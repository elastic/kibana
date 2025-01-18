/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANY_DATASET } from '../../../../common/fields_metadata';
import { HashedCache } from '../../../../common/hashed_cache';
import { FieldMetadata, IntegrationFieldName } from '../../../../common';
import {
  ExtractedIntegration,
  ExtractedIntegrationFields,
  IntegrationFieldsExtractor,
  IntegrationFieldsSearchParams,
  IntegrationListExtractor,
  IntegrationName,
} from './types';
import { PackageNotFoundError } from '../errors';
interface IntegrationFieldsRepositoryDeps {
  integrationFieldsExtractor: IntegrationFieldsExtractor;
  integrationListExtractor: IntegrationListExtractor;
}

type DatasetFieldsMetadata = Record<string, FieldMetadata>;
type IntegrationFieldsMetadataTree = Record<IntegrationName, DatasetFieldsMetadata>;

export class IntegrationFieldsRepository {
  private cache: HashedCache<IntegrationFieldsSearchParams, IntegrationFieldsMetadataTree>;
  private integrationsMap: Map<string, ExtractedIntegration>;

  private constructor(
    private readonly integrationFieldsExtractor: IntegrationFieldsExtractor,
    private readonly integrationListExtractor: IntegrationListExtractor
  ) {
    this.cache = new HashedCache();
    this.integrationsMap = new Map();

    this.extractIntegrationList();
  }

  async getByName(
    fieldName: IntegrationFieldName,
    params: Partial<IntegrationFieldsSearchParams>
  ): Promise<FieldMetadata | undefined> {
    const { integration, dataset } = this.extractIntegrationFieldsSearchParams(fieldName, params);

    if (!integration || !this.integrationsMap.has(integration)) {
      return undefined;
    }

    let field = this.getCachedField(fieldName, { integration, dataset });

    if (!field) {
      try {
        await this.extractFields({ integration, dataset });
      } catch (error) {
        throw new PackageNotFoundError(error.message);
      }

      field = this.getCachedField(fieldName, { integration, dataset });
    }

    return field;
  }

  public static create({
    integrationFieldsExtractor,
    integrationListExtractor,
  }: IntegrationFieldsRepositoryDeps) {
    return new IntegrationFieldsRepository(integrationFieldsExtractor, integrationListExtractor);
  }

  private extractIntegrationFieldsSearchParams(
    fieldName: IntegrationFieldName,
    params: Partial<IntegrationFieldsSearchParams>
  ) {
    const parts = fieldName.split('.');

    if (parts.length < 3) {
      return params;
    }

    const [extractedIntegration, extractedDataset] = parts;

    return {
      integration: params.integration ?? extractedIntegration,
      dataset: params.dataset ?? [extractedIntegration, extractedDataset].join('.'),
    };
  }

  private async extractFields({
    integration,
    dataset,
  }: IntegrationFieldsSearchParams): Promise<void> {
    const cacheKey = this.getCacheKey({ integration, dataset });
    const cachedIntegration = this.cache.get(cacheKey);

    if (cachedIntegration) {
      return undefined;
    }

    return this.integrationFieldsExtractor({ integration, dataset })
      .then(this.mapExtractedFieldsToFieldMetadataTree)
      .then((fieldMetadataTree) => this.storeFieldsInCache(cacheKey, fieldMetadataTree));
  }

  private extractIntegrationList(): void {
    void this.integrationListExtractor()
      .then(this.mapExtractedIntegrationListToMap)
      .then((integrationsMap) => (this.integrationsMap = integrationsMap));
  }

  private getCachedField(
    fieldName: IntegrationFieldName,
    { integration, dataset }: IntegrationFieldsSearchParams
  ): FieldMetadata | undefined {
    const cacheKey = this.getCacheKey({ integration, dataset });
    const cachedIntegration = this.cache.get(cacheKey);
    const datasetName = dataset === ANY_DATASET ? null : dataset;

    // 1. Integration fields were never fetched
    if (!cachedIntegration) {
      return undefined;
    }

    // 2. Dataset is passed but was never fetched before
    if (datasetName && !Object.hasOwn(cachedIntegration, datasetName)) {
      return undefined;
    }

    // 3. Dataset is passed and it was previously fetched, should return the field
    if (datasetName && Object.hasOwn(cachedIntegration, datasetName)) {
      const targetDataset = cachedIntegration[datasetName];
      return targetDataset[fieldName];
    }

    // 4. Dataset is not passed, we attempt search on all stored datasets
    if (!datasetName) {
      // Merge all the available datasets into a unique field list. Overriding fields might occur in the process.
      const cachedDatasetsFields = Object.assign({}, ...Object.values(cachedIntegration));
      return cachedDatasetsFields[fieldName];
    }
  }

  private storeFieldsInCache = (
    cacheKey: IntegrationFieldsSearchParams,
    extractedFieldsMetadata: IntegrationFieldsMetadataTree
  ): void => {
    const cachedIntegration = this.cache.get(cacheKey);

    if (!cachedIntegration) {
      this.cache.set(cacheKey, extractedFieldsMetadata);
    } else {
      this.cache.set(cacheKey, { ...cachedIntegration, ...extractedFieldsMetadata });
    }
  };

  private getCacheKey = ({ integration, dataset }: IntegrationFieldsSearchParams) => {
    const integrationDetails = this.integrationsMap.get(integration);

    if (integrationDetails) {
      return {
        dataset,
        integration,
        version: integrationDetails.version,
      };
    }

    return { integration, dataset };
  };

  private mapExtractedFieldsToFieldMetadataTree = (extractedFields: ExtractedIntegrationFields) => {
    const datasetGroups = Object.entries(extractedFields);

    return datasetGroups.reduce((integrationGroup, [datasetName, datasetGroup]) => {
      const datasetFieldsEntries = Object.entries(datasetGroup);

      integrationGroup[datasetName] = datasetFieldsEntries.reduce(
        (datasetFields, [fieldName, field]) => {
          datasetFields[fieldName] = FieldMetadata.create({ ...field, source: 'integration' });
          return datasetFields;
        },
        {} as DatasetFieldsMetadata
      );

      return integrationGroup;
    }, {} as IntegrationFieldsMetadataTree);
  };

  private mapExtractedIntegrationListToMap = (extractedIntegrations: ExtractedIntegration[]) => {
    return new Map(extractedIntegrations.map((integration) => [integration.name, integration]));
  };
}
