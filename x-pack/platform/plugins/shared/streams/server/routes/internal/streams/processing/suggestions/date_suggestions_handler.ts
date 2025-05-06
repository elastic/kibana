/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { isEmpty } from 'lodash';

export interface ProcessingDateSuggestionsParams {
  path: {
    name: string;
  };
  body: {
    dates: string[];
  };
}

export interface ProcessingDateSuggestionsHandlerDeps {
  params: ProcessingDateSuggestionsParams;
  scopedClusterClient: IScopedClusterClient;
}

export const processingDateSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    dates: z.array(NonEmptyString).nonempty(),
  }),
}) satisfies z.Schema<ProcessingDateSuggestionsParams>;

export const handleProcessingDateSuggestions = async ({
  params,
  scopedClusterClient,
}: ProcessingDateSuggestionsHandlerDeps) => {
  const { dates } = params.body;

  try {
    /* 0. Run structure detection against sample dates */
    const textStructureResponse =
      await scopedClusterClient.asCurrentUser.textStructure.findMessageStructure({
        messages: dates,
        format: 'semi_structured_text',
        ecs_compatibility: 'v1',
      });

    const formats = textStructureResponse.java_timestamp_formats;

    if (!formats || isEmpty(formats)) {
      return prepareEmptyResponse();
    }

    return { formats };
  } catch (error) {
    return prepareEmptyResponse();
  }
};

const prepareEmptyResponse = () => ({
  formats: [],
});
