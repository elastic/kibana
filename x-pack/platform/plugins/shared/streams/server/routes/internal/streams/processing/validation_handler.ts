/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';

export interface ProcessingValidationParams {
  path: {
    name: string;
  };
  body: {
    processing: StreamlangDSL;
  };
}

export interface ValidateProcessingDeps {
  params: ProcessingValidationParams;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
}

export const validateProcessing = async ({
  params,
  scopedClusterClient,
}: ValidateProcessingDeps) => {
  try {
    // Transpile the processing configuration to ingest pipeline processors
    const transpiledPipeline = transpileIngestPipeline(params.body.processing, {
      ignoreMalformed: true,
      traceCustomIdentifiers: true,
    });

    // Attempt pipeline simulation with empty docs array to validate syntax
    await scopedClusterClient.asCurrentUser.ingest.simulate({
      docs: [], // Empty docs array - this should trigger the expected error
      pipeline: {
        processors: transpiledPipeline.processors,
        // @ts-expect-error field_access_pattern not supported by typing yet
        field_access_pattern: 'flexible',
      },
      verbose: true,
    });

    // If we reach here without the expected error, something unexpected happened
    return {
      valid: false,
      error: {
        type: 'unexpected_success',
        message: 'Pipeline simulation succeeded unexpectedly with empty documents',
      },
    };
  } catch (error) {
    if (error instanceof esErrors.ResponseError) {
      const errorType = error.body?.error?.type;
      const errorReason = error.body?.error?.reason;

      // This is the expected error when docs array is empty - validation passed
      if (
        errorType === 'illegal_argument_exception' &&
        errorReason === 'must specify at least one document in [docs]'
      ) {
        return {
          valid: true,
        };
      }

      // Any other error indicates a problem with the processing configuration
      return {
        valid: false,
        error: {
          type: errorType || 'unknown_error',
          message: errorReason || error.message,
          processor_tag: error.body?.error?.processor_tag,
        },
      };
    }

    // Non-Elasticsearch errors
    return {
      valid: false,
      error: {
        type: 'validation_error',
        message: error.message,
      },
    };
  }
};
