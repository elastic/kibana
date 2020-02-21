/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';
import { RequestHandlerContext } from 'src/core/server';

import { ANNOTATION_TYPE } from '../../../common/constants/annotations';
import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
} from '../../../common/constants/index_patterns';

import {
  Annotation,
  Annotations,
  isAnnotation,
  isAnnotations,
} from '../../../common/types/annotations';

// TODO All of the following interface/type definitions should
// eventually be replaced by the proper upstream definitions
interface EsResult {
  _source: object;
  _id: string;
}

export interface IndexAnnotationArgs {
  jobIds: string[];
  earliestMs: number;
  latestMs: number;
  maxAnnotations: number;
}

export interface GetParams {
  index: string;
  size: number;
  body: object;
}

export interface GetResponse {
  success: true;
  annotations: {
    [key: string]: Annotations;
  };
}

export interface IndexParams {
  index: string;
  body: Annotation;
  refresh?: string;
  id?: string;
}

export interface DeleteParams {
  index: string;
  refresh?: string;
  id: string;
}

type annotationProviderParams = DeleteParams | GetParams | IndexParams;

export type callWithRequestType = (
  action: string,
  params: annotationProviderParams
) => Promise<any>;

export function annotationProvider(context: RequestHandlerContext) {
  const callAsCurrentUser = context.ml!.mlClient.callAsCurrentUser;
  async function indexAnnotation(annotation: Annotation, username: string) {
    if (isAnnotation(annotation) === false) {
      // No need to translate, this will not be exposed in the UI.
      return Promise.reject(new Error('invalid annotation format'));
    }

    if (annotation.create_time === undefined) {
      annotation.create_time = new Date().getTime();
      annotation.create_username = username;
    }

    annotation.modified_time = new Date().getTime();
    annotation.modified_username = username;

    const params: IndexParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
      body: annotation,
      refresh: 'wait_for',
    };

    if (typeof annotation._id !== 'undefined') {
      params.id = annotation._id;
      delete params.body._id;
      delete params.body.key;
    }

    return await callAsCurrentUser('index', params);
  }

  async function getAnnotations({
    jobIds,
    earliestMs,
    latestMs,
    maxAnnotations,
  }: IndexAnnotationArgs) {
    const obj: GetResponse = {
      success: true,
      annotations: {},
    };

    const boolCriteria: object[] = [];

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    // The nested must_not time range filter queries make sure that we fetch:
    // - annotations with start and end within the time range
    // - annotations that either start or end within the time range
    // - annotations that start before and end after the given time range
    // - but skip annotation that are completely outside the time range
    //   (the ones that start and end before or after the time range)
    if (earliestMs !== null && latestMs !== null) {
      boolCriteria.push({
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  {
                    range: {
                      end_timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  {
                    range: {
                      end_timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    }

    boolCriteria.push({
      exists: { field: 'annotation' },
    });

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i: number) => {
        jobIdFilterStr += `${i! > 0 ? ' OR ' : ''}job_id:${jobId}`;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    const params: GetParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
      size: maxAnnotations,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: `type:${ANNOTATION_TYPE.ANNOTATION}`,
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
          },
        },
      },
    };

    try {
      const resp = await callAsCurrentUser('search', params);

      if (resp.error !== undefined && resp.message !== undefined) {
        // No need to translate, this will not be exposed in the UI.
        throw new Error(`Annotations couldn't be retrieved from Elasticsearch.`);
      }

      const docs: Annotations = _.get(resp, ['hits', 'hits'], []).map((d: EsResult) => {
        // get the original source document and the document id, we need it
        // to identify the annotation when editing/deleting it.
        return { ...d._source, _id: d._id } as Annotation;
      });

      if (isAnnotations(docs) === false) {
        // No need to translate, this will not be exposed in the UI.
        throw new Error(`Annotations didn't pass integrity check.`);
      }

      docs.forEach((doc: Annotation) => {
        const jobId = doc.job_id;
        if (typeof obj.annotations[jobId] === 'undefined') {
          obj.annotations[jobId] = [];
        }
        obj.annotations[jobId].push(doc);
      });

      return obj;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function deleteAnnotation(id: string) {
    const param: DeleteParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
      id,
      refresh: 'wait_for',
    };

    return await callAsCurrentUser('delete', param);
  }

  return {
    getAnnotations,
    indexAnnotation,
    deleteAnnotation,
  };
}
