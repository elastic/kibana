/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, intersection } from 'lodash';
import moment from 'moment';
import type {
  IndicesIndexSettings,
  IngestDeletePipelineResponse,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getHttp } from '../kibana_services';
import { MB } from '../../common/constants';
import type {
  ImportDoc,
  ImportFailure,
  ImportResponse,
  IngestPipeline,
  IngestPipelineWrapper,
} from '../../common/types';
import { CreateDocsResponse, IImporter, ImportResults } from './types';

const CHUNK_SIZE = 5000;
const REDUCED_CHUNK_SIZE = 100;
export const MAX_CHUNK_CHAR_COUNT = 1000000;
export const IMPORT_RETRIES = 5;
const STRING_CHUNKS_MB = 100;
const DEFAULT_TIME_FIELD = '@timestamp';

export abstract class Importer implements IImporter {
  protected _docArray: ImportDoc[] = [];
  protected _chunkSize = CHUNK_SIZE;
  private _index: string | undefined;
  private _pipeline: IngestPipeline | undefined;
  private _timeFieldName: string | undefined;
  private _initialized = false;

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
    const decoder = new TextDecoder();
    const size = STRING_CHUNKS_MB * MB;

    // chop the data up into 100MB chunks for processing.
    // if the chop produces a partial line at the end, a character "remainder" count
    // is returned which is used to roll the next chunk back that many chars so
    // it is included in the next chunk.
    const parts = Math.ceil(data.byteLength / size);
    let remainder = 0;
    for (let i = 0; i < parts; i++) {
      const byteArray = decoder.decode(data.slice(i * size - remainder, (i + 1) * size));
      const {
        success,
        docs,
        remainder: tempRemainder,
      } = this._createDocs(byteArray, i === parts - 1);
      if (success) {
        this._docArray = this._docArray.concat(docs);
        remainder = tempRemainder;
      } else {
        return { success: false };
      }
    }

    return { success: true };
  }

  protected abstract _createDocs(t: string, isLastPart: boolean): CreateDocsResponse<ImportDoc>;

  public async initializeImport(
    index: string,
    settings: IndicesIndexSettings,
    mappings: MappingTypeMapping,
    pipeline: IngestPipeline | undefined,
    createPipelines?: IngestPipeline[]
  ) {
    let ingestPipelineWrapper: IngestPipelineWrapper | undefined;
    if (pipeline !== undefined) {
      updatePipelineTimezone(pipeline);

      if (pipelineContainsSpecialProcessors(pipeline)) {
        // pipeline contains processors which we know are slow
        // so reduce the chunk size significantly to avoid timeouts
        this._chunkSize = REDUCED_CHUNK_SIZE;
      }
      // if no pipeline has been supplied,
      // send an empty object
      ingestPipelineWrapper = {
        id: `${index}-pipeline`,
        pipeline,
      };
    }

    let createPipelinesWrappers: IngestPipelineWrapper[] | undefined;
    if (createPipelines) {
      createPipelinesWrappers = createPipelines.map((p, i) => {
        return {
          id: `${index}-${i}-pipeline`,
          pipeline: p,
        };
      });
    }

    this._index = index;
    this._pipeline = pipeline;

    // if an @timestamp field has been added to the
    // mappings, use this field as the time field.
    // This relies on the field being populated by
    // the ingest pipeline on ingest
    this._timeFieldName = isPopulatedObject(mappings.properties, [DEFAULT_TIME_FIELD])
      ? DEFAULT_TIME_FIELD
      : undefined;

    this._initialized = true;

    return await callImportRoute({
      id: undefined,
      index,
      data: [],
      settings,
      mappings,
      ingestPipeline: ingestPipelineWrapper,
      createPipelines: createPipelinesWrappers,
    });
  }

  public async initializeWithoutCreate(
    index: string,
    mappings: MappingTypeMapping,
    pipeline: IngestPipeline | undefined
  ) {
    if (pipeline !== undefined) {
      if (pipelineContainsSpecialProcessors(pipeline)) {
        // pipeline contains processors which we know are slow
        // so reduce the chunk size significantly to avoid timeouts
        this._chunkSize = REDUCED_CHUNK_SIZE;
      }
    }

    this._index = index;
    this._pipeline = pipeline;

    // if an @timestamp field has been added to the
    // mappings, use this field as the time field.
    // This relies on the field being populated by
    // the ingest pipeline on ingest
    this._timeFieldName = isPopulatedObject(mappings.properties, [DEFAULT_TIME_FIELD])
      ? DEFAULT_TIME_FIELD
      : undefined;

    this._initialized = true;
  }

  public async import(
    id: string,
    index: string,
    pipelineId: string | undefined,
    setImportProgress: (progress: number) => void
  ): Promise<ImportResults> {
    if (!id || !index) {
      return {
        success: false,
        error: i18n.translate('xpack.fileUpload.import.noIdOrIndexSuppliedErrorMessage', {
          defaultMessage: 'no ID or index supplied',
        }),
      };
    }

    const chunks = createDocumentChunks(this._docArray, this._chunkSize);

    const ingestPipeline: IngestPipelineWrapper | undefined = pipelineId
      ? {
          id: pipelineId,
        }
      : undefined;

    let success = true;
    const failures: ImportFailure[] = [];
    let error;

    for (let i = 0; i < chunks.length; i++) {
      let retries = IMPORT_RETRIES;
      let resp: ImportResponse = {
        success: false,
        failures: [],
        docCount: 0,
        id: '',
        index: '',
        pipelineId: '',
      };

      while (resp.success === false && retries > 0) {
        try {
          resp = await callImportRoute({
            id,
            index,
            data: chunks[i],
            settings: {},
            mappings: {},
            ingestPipeline,
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
    if (this._initialized === false || this._pipeline === undefined) {
      throw new Error('Import has not been initialized');
    }

    // take the first and last 10 docs from the file, to reduce the chance of getting
    // bad data or out of order data.
    const firstDocs = this._getFirstReadDocs(10);
    const lastDocs = this._getLastReadDocs(10);

    const body = JSON.stringify({
      docs: firstDocs.concat(lastDocs),
      pipeline: this._pipeline,
      timeField: this._timeFieldName,
    });
    return await getHttp().fetch<{ start: number | null; end: number | null }>({
      path: `/internal/file_upload/preview_index_time_range`,
      method: 'POST',
      version: '1',
      body,
    });
  }

  public async deletePipelines(pipelineIds: string[]) {
    // remove_pipelines
    // const body = JSON.stringify({
    //   pipelineIds,
    // });

    return await getHttp().fetch<IngestDeletePipelineResponse[]>({
      path: `/internal/file_upload/remove_pipelines/${pipelineIds.join(',')}`,
      method: 'DELETE',
      version: '1',
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

// The file structure endpoint sets the timezone to be {{ event.timezone }}
// as that's the variable Filebeat would send the client timezone in.
// In this data import function the UI is effectively performing the role of Filebeat,
// i.e. doing basic parsing, processing and conversion to JSON before forwarding to the ingest pipeline.
// But it's not sending every single field that Filebeat would add, so the ingest pipeline
// cannot look for a event.timezone variable in each input record.
// Therefore we need to replace {{ event.timezone }} with the actual browser timezone
function updatePipelineTimezone(ingestPipeline: IngestPipeline) {
  if (ingestPipeline !== undefined && ingestPipeline.processors && ingestPipeline.processors) {
    const dateProcessor = ingestPipeline.processors.find(
      (p: any) => p.date !== undefined && p.date.timezone === '{{ event.timezone }}'
    );

    if (dateProcessor) {
      dateProcessor.date.timezone = moment.tz.guess();
    }
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

export function callImportRoute({
  id,
  index,
  data,
  settings,
  mappings,
  ingestPipeline,
  createPipelines,
}: {
  id: string | undefined;
  index: string;
  data: ImportDoc[];
  settings: IndicesIndexSettings;
  mappings: MappingTypeMapping;
  ingestPipeline: IngestPipelineWrapper | undefined;
  createPipelines?: IngestPipelineWrapper[];
}) {
  const query = id !== undefined ? { id } : {};
  const body = JSON.stringify({
    index,
    data,
    settings,
    mappings,
    ingestPipeline,
    createPipelines,
  });

  return getHttp().fetch<ImportResponse>({
    path: `/internal/file_upload/import`,
    method: 'POST',
    version: '1',
    query,
    body,
  });
}
