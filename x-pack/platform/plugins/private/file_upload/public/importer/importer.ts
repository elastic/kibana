/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, cloneDeep, intersection } from 'lodash';
import type {
  IndicesIndexSettings,
  IngestDeletePipelineResponse,
  IngestSimulateResponse,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import {
  type MessageReader,
  type TikaReader,
  type NdjsonReader,
  type ImportDoc,
  type ImportFailure,
  type ImportResponse,
  type IngestPipeline,
  type IngestPipelineWrapper,
  type ImportResults,
  updatePipelineTimezone,
} from '@kbn/file-upload-common';
import { getHttp } from '../kibana_services';

import type { IImporter } from './types';
import { callImportRoute, callInitializeImportRoute } from './routes';

const CHUNK_SIZE = 5000;
const REDUCED_CHUNK_SIZE = 100;
export const MAX_CHUNK_CHAR_COUNT = 1000000;
export const IMPORT_RETRIES = 5;
const DEFAULT_TIME_FIELD = '@timestamp';

export abstract class Importer implements IImporter {
  protected _docArray: ImportDoc[] = [];
  protected _chunkSize = CHUNK_SIZE;
  private _index: string | undefined;
  private _pipelines: IngestPipelineWrapper[] = [];
  private _timeFieldName: string | undefined;
  private _initialized = false;
  protected abstract _reader: MessageReader | TikaReader | NdjsonReader;

  public initialized() {
    return this._initialized;
  }

  public getIndex() {
    return this._index;
  }

  public getTimeField() {
    return this._timeFieldName;
  }

  public read(data: ArrayBuffer) {
    this._docArray = this._reader.read(data);

    return { success: true };
  }

  private _initialize(
    index: string,
    mappings: MappingTypeMapping,
    pipelines: Array<IngestPipeline | undefined>
  ) {
    for (let i = 0; i < pipelines.length; i++) {
      const pipeline = pipelines[i];
      if (pipeline !== undefined) {
        updatePipelineTimezone(pipeline);

        if (pipelineContainsSpecialProcessors(pipeline)) {
          // pipeline contains processors which we know are slow
          // so reduce the chunk size significantly to avoid timeouts
          this._chunkSize = REDUCED_CHUNK_SIZE;
        }
      }

      this._pipelines.push({
        id: `${index}-${i}-pipeline`,
        pipeline,
      });
    }

    this._index = index;

    // if an @timestamp field has been added to the
    // mappings, use this field as the time field.
    // This relies on the field being populated by
    // the ingest pipeline on ingest
    this._timeFieldName = isPopulatedObject(mappings.properties, [DEFAULT_TIME_FIELD])
      ? DEFAULT_TIME_FIELD
      : undefined;

    this._initialized = true;
  }

  public async initializeImport(
    index: string,
    settings: IndicesIndexSettings,
    mappings: MappingTypeMapping,
    pipelines: Array<IngestPipeline | undefined>,
    existingIndex: boolean = false
  ) {
    this._initialize(index, mappings, pipelines);

    return await callInitializeImportRoute({
      index,
      settings,
      mappings,
      ingestPipelines: this._pipelines,
      existingIndex,
    });
  }

  public async initializeWithoutCreate(
    index: string,
    mappings: MappingTypeMapping,
    pipelines: IngestPipeline[]
  ) {
    this._initialize(index, mappings, pipelines);
  }

  public async import(
    index: string,
    ingestPipelineId: string,
    setImportProgress: (progress: number) => void
  ): Promise<ImportResults> {
    if (!index) {
      return {
        success: false,
        error: i18n.translate('xpack.fileUpload.import.noIndexSuppliedErrorMessage', {
          defaultMessage: 'No index supplied',
        }),
      };
    }

    const chunks = createDocumentChunks(this._docArray, this._chunkSize);

    let success = true;
    const failures: ImportFailure[] = [];
    let error;

    for (let i = 0; i < chunks.length; i++) {
      let retries = IMPORT_RETRIES;
      let resp: ImportResponse = {
        success: false,
        failures: [],
        docCount: 0,
        index: '',
        pipelineId: '',
      };

      while (resp.success === false && retries > 0) {
        try {
          resp = await callImportRoute({
            index,
            ingestPipelineId,
            data: chunks[i],
          });

          if (retries < IMPORT_RETRIES) {
            // eslint-disable-next-line no-console
            console.log(`Retrying import ${IMPORT_RETRIES - retries}`);
          }

          retries--;
        } catch (err) {
          resp.success = false;
          resp.error = err;
          retries = 0;
        }
      }

      if (resp.success) {
        setImportProgress(((i + 1) / chunks.length) * 100);
      } else {
        // eslint-disable-next-line no-console
        console.error(resp);
        success = false;
        error = resp.error;
        populateFailures(resp, failures, i, this._chunkSize);
        break;
      }

      populateFailures(resp, failures, i, this._chunkSize);
    }

    const result: ImportResults = {
      success,
      failures,
      docCount: this._docArray.length,
    };

    if (success) {
      setImportProgress(100);
    } else {
      result.error = error;
    }

    return result;
  }

  private _getFirstReadDocs(count = 1): object[] {
    const firstReadDocs = this._docArray.slice(0, count);
    return firstReadDocs.map((doc) => (typeof doc === 'string' ? JSON.parse(doc) : doc));
  }

  private _getLastReadDocs(count = 1): object[] {
    const lastReadDocs = this._docArray.slice(-count);
    return lastReadDocs.map((doc) => (typeof doc === 'string' ? JSON.parse(doc) : doc));
  }

  public async previewIndexTimeRange() {
    const ingestPipeline = this._pipelines[0];
    if (this._initialized === false || ingestPipeline?.pipeline === undefined) {
      throw new Error('Import has not been initialized');
    }

    // take the first and last 10 docs from the file, to reduce the chance of getting
    // bad data or out of order data.
    const firstDocs = this._getFirstReadDocs(10);
    const lastDocs = this._getLastReadDocs(10);

    const body = JSON.stringify({
      docs: firstDocs.concat(lastDocs),
      pipeline: ingestPipeline.pipeline,
      timeField: this._timeFieldName,
    });
    return await getHttp().fetch<{ start: number | null; end: number | null }>({
      path: `/internal/file_upload/preview_index_time_range`,
      method: 'POST',
      version: '1',
      body,
    });
  }

  public async deletePipelines() {
    const ids = this._pipelines.filter((p) => p.pipeline !== undefined).map((p) => p.id);

    if (ids.length === 0) {
      return [];
    }

    return await getHttp().fetch<IngestDeletePipelineResponse[]>({
      path: `/internal/file_upload/remove_pipelines/${ids.join(',')}`,
      method: 'DELETE',
      version: '1',
    });
  }

  public async previewDocs(
    data: ArrayBuffer,
    ingestPipeline: IngestPipeline,
    limit = 20
  ): Promise<IngestSimulateResponse> {
    this.read(data);
    const pipeline = cloneDeep(ingestPipeline);
    updatePipelineTimezone(pipeline);

    return await getHttp().fetch<IngestSimulateResponse>({
      path: `/internal/file_upload/preview_docs`,
      method: 'POST',
      version: '1',
      body: JSON.stringify({
        // first doc is the header
        docs: this._docArray.slice(1, limit + 1),
        pipeline,
      }),
    });
  }
}

function populateFailures(
  error: ImportResponse,
  failures: ImportFailure[],
  chunkCount: number,
  chunkSize: number
) {
  if (error.failures && error.failures.length) {
    // update the item value to include the chunk count
    // e.g. item 3 in chunk 2 is actually item 20003
    for (let f = 0; f < error.failures.length; f++) {
      const failure = error.failures[f];
      failure.item = failure.item + chunkSize * chunkCount;
    }
    failures.push(...error.failures);
  }
}

function createDocumentChunks(docArray: ImportDoc[], chunkSize: number) {
  if (chunkSize === 0) {
    return [docArray];
  }

  const chunks: ImportDoc[][] = [];
  // chop docArray into chunks
  const tempChunks = chunk(docArray, chunkSize);

  // loop over tempChunks and check that the total character length
  // for each chunk is within the MAX_CHUNK_CHAR_COUNT.
  // if the length is too long, split the chunk into smaller chunks
  // based on how much larger it is than MAX_CHUNK_CHAR_COUNT
  // note, each document is a different size, so dividing by charCountOfDocs
  // only produces an average chunk size that should be smaller than the max length
  for (let i = 0; i < tempChunks.length; i++) {
    const docs = tempChunks[i];
    const numberOfDocs = docs.length;

    const charCountOfDocs = JSON.stringify(docs).length;
    if (charCountOfDocs > MAX_CHUNK_CHAR_COUNT) {
      // calculate new chunk size which should produce a chunk
      // who's length is on average around MAX_CHUNK_CHAR_COUNT
      const adjustedChunkSize = Math.floor((MAX_CHUNK_CHAR_COUNT / charCountOfDocs) * numberOfDocs);
      const smallerChunks = chunk(docs, adjustedChunkSize);
      chunks.push(...smallerChunks);
    } else {
      chunks.push(docs);
    }
  }
  return chunks;
}

function pipelineContainsSpecialProcessors(pipeline: IngestPipeline) {
  const findKeys = (obj: object) => {
    // return all nested keys in the pipeline
    const keys: string[] = [];
    Object.entries(obj).forEach(([key, val]) => {
      keys.push(key);
      if (isPopulatedObject(val)) {
        keys.push(...findKeys(val));
      }
    });
    return keys;
  };
  const keys = findKeys(pipeline);

  const specialProcessors = ['inference', 'enrich'];
  return intersection(specialProcessors, keys).length !== 0;
}
