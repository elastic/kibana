/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString, uniq } from 'lodash';
import { z } from '@kbn/zod';
import { IScopedClusterClient } from '@kbn/core/server';
import { NonEmptyString } from '@kbn/zod-helpers';

export interface ProcessingDateSuggestionsParams {
  path: {
    name: string;
  };
  body: {
    dates: unknown[];
  };
}

export interface ProcessingDateSuggestionsHandlerDeps {
  params: ProcessingDateSuggestionsParams;
  scopedClusterClient: IScopedClusterClient;
}

export const processingDateSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    dates: z.array(z.unknown()).nonempty(),
  }),
}) satisfies z.Schema<ProcessingDateSuggestionsParams>;

export const handleProcessingDateSuggestions = async ({
  params,
  scopedClusterClient,
}: ProcessingDateSuggestionsHandlerDeps) => {
  const dates = parseDatesInput(params.body.dates);
  /**
   * Run structure detection against sample dates.
   * The `findMessageStructure` API is used to detect the structure of the date strings.
   * One limitation of this API is that it uses a single detection pattern that matches the first message, so upcoming messages with a much different structure would cause a generic failure.
   * To work around this, we have a series of attempts:
   * - Run a single detection. If successful, we collect the result.
   * - If the first detection fails, we run the detection against all sample dates individually and collect the unique formats.
   * - If the second detection fails, we return an empty response.
   */
  let formats: string[] = [];

  /**
   * 1. Run a single detection. If successful, we collect the result.
   */
  try {
    formats = await attemptSingleDetection({ scopedClusterClient, dates });

    return { formats };
  } catch {
    // Noop, continue to the next step
    // We gracefully handle detection failures by returning an empty response.
  }

  /**
   * 2. Run the detection against all sample dates individually and collect the unique formats.
   */
  try {
    formats = await attemptParallelDetection({ scopedClusterClient, dates });
  } catch {
    // Noop, continue to the next step
    // We gracefully handle detection failures by returning an empty response.
  }

  return { formats };
};

function parseDatesInput(dates: unknown[]): string[] {
  const areValidDates = z
    .array(z.union([NonEmptyString, z.number()]))
    .nonempty()
    .safeParse(dates).success;

  if (!areValidDates) {
    throw new Error('Dates input must be non-empty string or number values.');
  }

  return dates.map(String);
}

interface DetectionAttemptParams {
  scopedClusterClient: IScopedClusterClient;
  dates: string[];
}

const attemptSingleDetection = async ({ scopedClusterClient, dates }: DetectionAttemptParams) => {
  const textStructureResponse = await detectDatesStructure({ scopedClusterClient, dates });

  const formats = textStructureResponse.java_timestamp_formats ?? [];
  return formats;
};

const attemptParallelDetection = async ({ scopedClusterClient, dates }: DetectionAttemptParams) => {
  const textStructureResponses = await Promise.allSettled(
    dates.map((date) => detectDatesStructure({ scopedClusterClient, dates: [date] }))
  );

  const formats = uniq(
    textStructureResponses
      .filter(isFulfilled) // Filter out any rejected promises
      .flatMap((textStructureResponse) => textStructureResponse.value.java_timestamp_formats) // Flatten the array of detected formats
      .filter(isString) // Filter out any undefined values
  );

  return formats;
};

function detectDatesStructure({ scopedClusterClient, dates }: DetectionAttemptParams) {
  return scopedClusterClient.asInternalUser.textStructure.findMessageStructure({
    messages: dates,
    format: 'semi_structured_text',
    ecs_compatibility: 'v1',
  });
}

function isFulfilled<T>(item: PromiseSettledResult<T>): item is PromiseFulfilledResult<T> {
  return item.status === 'fulfilled';
}
