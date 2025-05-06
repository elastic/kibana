/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniq } from 'lodash';
import { z } from '@kbn/zod';
import { IScopedClusterClient } from '@kbn/core/server';
import { NonEmptyString } from '@kbn/zod-helpers';

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
    /**
     * 1. Run structure detection against sample dates
     * The `findMessageStructure` API is used to detect the structure of the date strings.
     * One limitation of this API is that it uses a single detection pattern that matches the first message, so upcoming messages with a much different structure would cause a generic failure.
     * To work around this, we run the detection against all sample dates individually and collect the unique formats.
     */
    const textStructureResponses = await Promise.allSettled(
      dates.map((date) =>
        scopedClusterClient.asCurrentUser.textStructure.findMessageStructure({
          messages: [date],
          format: 'semi_structured_text',
          ecs_compatibility: 'v1',
        })
      )
    );

    const formats = uniq(
      textStructureResponses
        .filter(isFulfilled) // Filter out any rejected promises
        .flatMap((textStructureResponse) => textStructureResponse.value.java_timestamp_formats) // Flatten the array of detected formats
        .filter((format): format is string => Boolean(format)) // Filter out any undefined values
    );

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

function isFulfilled<T>(item: PromiseSettledResult<T>): item is PromiseFulfilledResult<T> {
  return item.status === 'fulfilled';
}
