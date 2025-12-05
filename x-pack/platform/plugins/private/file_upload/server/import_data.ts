/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  BulkRequest,
  IndicesCreateRequest,
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import { INDEX_META_DATA_CREATED_BY } from '@kbn/file-upload-common';
import { isEqual } from 'lodash';
import type {
  ImportResponse,
  ImportFailure,
  InputData,
  IngestPipelineWrapper,
  InitializeImportResponse,
} from '@kbn/file-upload-common';

export function importDataProvider({ asCurrentUser }: IScopedClusterClient) {
  async function initializeImport(
    index: string,
    settings: IndicesIndexSettings,
    mappings: MappingTypeMapping,
    ingestPipelines: IngestPipelineWrapper[],
    existingIndex: boolean = false
  ): Promise<InitializeImportResponse> {
    let createdIndex;
    const createdPipelineIds: Array<string | undefined> = [];
    const id = generateId();
    try {
      if (existingIndex) {
        await updateMappings(index, mappings);
      } else {
        await createIndex(index, settings, mappings);
      }
      createdIndex = index;

      // create the pipeline if one has been supplied
      if (ingestPipelines !== undefined) {
        for (const p of ingestPipelines) {
          if (p.pipeline === undefined) {
            createdPipelineIds.push(undefined);
            continue;
          }
          const resp = await createPipeline(p.id, p.pipeline);
          createdPipelineIds.push(p.id);
          if (resp.acknowledged !== true) {
            throw resp;
          }
        }
      }

      return {
        success: true,
        id,
        index: createdIndex,
        pipelineIds: createdPipelineIds,
      };
    } catch (error) {
      return {
        success: false,
        id: id!,
        index: createdIndex ?? '',
        pipelineIds: createdPipelineIds,
        error: error.body !== undefined ? error.body : error,
      };
    }
  }

  async function importData(
    index: string,
    ingestPipelineId: string | undefined,
    data: InputData
  ): Promise<ImportResponse> {
    const docCount = data.length;
    const pipelineId = ingestPipelineId;

    try {
      let failures: ImportFailure[] = [];
      if (data.length) {
        const resp = await indexData(index, pipelineId, data);
        if (resp.success === false) {
          if (resp.ingestError) {
            // all docs failed, abort
            throw resp;
          } else {
            // some docs failed.
            // still report success but with a list of failures
            failures = resp.failures || [];
          }
        }
      }

      return {
        success: true,
        index,
        pipelineId,
        docCount,
        failures,
      };
    } catch (error) {
      return {
        success: false,
        index,
        pipelineId,
        error: error.body !== undefined ? error.body : error,
        docCount,
        ingestError: error.ingestError,
        failures: error.failures || [],
      };
    }
  }

  async function createIndex(
    index: string,
    settings: IndicesIndexSettings,
    mappings: MappingTypeMapping
  ) {
    const body: Omit<IndicesCreateRequest, 'index'> = {
      mappings: {
        _meta: {
          created_by: INDEX_META_DATA_CREATED_BY,
        },
        properties: mappings.properties,
      },
    };

    if (settings && Object.keys(settings).length) {
      body.settings = settings;
    }

    await asCurrentUser.indices.create({ index, ...body }, { maxRetries: 0 });
  }

  async function updateMappings(index: string, mappings: MappingTypeMapping) {
    const resp = await asCurrentUser.indices.getMapping({ index });
    const existingMappings = resp[index]?.mappings;
    if (!isEqual(existingMappings.properties, mappings.properties)) {
      await asCurrentUser.indices.putMapping({ index, ...mappings });
    }
  }

  async function indexData(index: string, pipelineId: string | undefined, data: InputData) {
    try {
      const body: BulkRequest['body'] = [];
      for (let i = 0; i < data.length; i++) {
        body.push({ index: {} });
        body.push(data[i]);
      }

      const bulkRequest: BulkRequest = { index, body };
      if (pipelineId !== undefined) {
        bulkRequest.pipeline = pipelineId;
      }

      const resp = await asCurrentUser.bulk(bulkRequest, {
        maxRetries: 0,
        requestTimeout: 3600000,
      });
      if (resp.errors) {
        throw resp;
      } else {
        return {
          success: true,
          docs: data.length,
          failures: [],
        };
      }
    } catch (error) {
      let failures: ImportFailure[] = [];
      let ingestError = false;
      if (error.errors !== undefined && Array.isArray(error.items)) {
        // an expected error where some or all of the bulk request
        // docs have failed to be ingested.
        failures = getFailures(error.items, data);
      } else {
        // some other error has happened.
        ingestError = true;
      }

      return {
        success: false,
        error,
        docCount: data.length,
        failures,
        ingestError,
      };
    }
  }

  async function createPipeline(id: string, pipeline: any) {
    return await asCurrentUser.ingest.putPipeline({ id, body: pipeline });
  }

  function getFailures(items: any[], data: InputData): ImportFailure[] {
    const failures: ImportFailure[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.index && item.index.error) {
        failures.push({
          item: i,
          reason: item.index.error.reason,
          caused_by: item.index.error.caused_by,
          doc: data[i],
        });
      }
    }
    return failures;
  }

  return {
    initializeImport,
    importData,
  };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
