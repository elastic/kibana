/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ml } from '../../../../../services/ml_api_service';
import { chunk } from 'lodash';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

const CHUNK_SIZE = 5000;
const MAX_CHUNK_CHAR_COUNT = 1000000;
const IMPORT_RETRIES = 5;

export class Importer {
  constructor({ settings, mappings, pipeline }) {
    this.settings = settings;
    this.mappings = mappings;
    this.pipeline = pipeline;

    this.data = [];
    this.docArray = [];
    this.docSizeArray = [];
  }

  async initializeImport(index) {
    const settings = this.settings;
    const mappings = this.mappings;
    const pipeline = this.pipeline;
    updatePipelineTimezone(pipeline);

    // if no pipeline has been supplied,
    // send an empty object
    const ingestPipeline = (pipeline !== undefined) ? {
      id: `${index}-pipeline`,
      pipeline,
    } : {};

    const createIndexResp = await ml.fileDatavisualizer.import({
      id: undefined,
      index,
      data: [],
      settings,
      mappings,
      ingestPipeline
    });

    return createIndexResp;
  }

  async import(id, index, pipelineId, setImportProgress) {
    if (!id || !index) {
      return {
        success: false,
        error: i18n.translate('xpack.ml.fileDatavisualizer.importView.noIdOrIndexSuppliedErrorMessage', {
          defaultMessage: 'no ID or index supplied'
        })
      };
    }

    const chunks = createDocumentChunks(this.docArray);

    const ingestPipeline = {
      id: pipelineId,
    };

    let success = true;
    const failures = [];
    let error;

    for (let i = 0; i < chunks.length; i++) {
      const aggs = {
        id,
        index,
        data: chunks[i],
        settings: {},
        mappings: {},
        ingestPipeline
      };

      let retries = IMPORT_RETRIES;
      let resp = {
        success: false,
        failures: [],
        docCount: 0,
      };

      while (resp.success === false && retries > 0) {
        try {
          resp = await ml.fileDatavisualizer.import(aggs);

          if (retries < IMPORT_RETRIES) {
            console.log(`Retrying import ${IMPORT_RETRIES - retries}`);
          }

          retries--;
        } catch (err) {
          resp = { success: false, error: err };
          retries = 0;
        }
      }

      if (resp.success) {
        setImportProgress(((i + 1) / chunks.length) * 100);
      } else {
        console.error(resp);
        success = false;
        error = resp.error;
        populateFailures(resp, failures, i);
        break;
      }

      populateFailures(resp, failures, i);
    }

    const result = {
      success,
      failures,
      docCount: this.docArray.length,
    };

    if (success) {
      setImportProgress(100);
    } else {
      result.error = error;
    }

    return result;
  }
}

function populateFailures(error, failures, chunkCount) {
  if (error.failures && error.failures.length) {
    // update the item value to include the chunk count
    // e.g. item 3 in chunk 2 is actually item 20003
    for (let f = 0; f < error.failures.length; f++) {
      const failure = error.failures[f];
      failure.item = failure.item + (CHUNK_SIZE * chunkCount);
    }
    failures.push(...error.failures);
  }
}

// The file structure endpoint sets the timezone to be {{ beat.timezone }}
// as that's the variable Filebeat would send the client timezone in.
// In this data import function the UI is effectively performing the role of Filebeat,
// i.e. doing basic parsing, processing and conversion to JSON before forwarding to the ingest pipeline.
// But it's not sending every single field that Filebeat would add, so the ingest pipeline
// cannot look for a beat.timezone variable in each input record.
// Therefore we need to replace {{ beat.timezone }} with the actual browser timezone
function updatePipelineTimezone(ingestPipeline) {
  if (ingestPipeline !== undefined && ingestPipeline.processors && ingestPipeline.processors) {
    const dateProcessor = ingestPipeline.processors.find(p => (p.date !== undefined && p.date.timezone === '{{ beat.timezone }}'));

    if (dateProcessor) {
      dateProcessor.date.timezone = moment.tz.guess();
    }
  }
}

function createDocumentChunks(docArray) {
  const chunks = [];
  // chop docArray into 5000 doc chunks
  const tempChunks = chunk(docArray, CHUNK_SIZE);

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
