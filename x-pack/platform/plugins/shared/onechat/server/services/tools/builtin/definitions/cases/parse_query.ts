/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ScopedModel } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';

const casesQueryParamsSchema = z
  .object({
    start: z
      .string()
      .optional()
      .describe(
        'ISO datetime string for the start time to fetch cases (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
      ),
    end: z
      .string()
      .optional()
      .describe(
        'ISO datetime string for the end time to fetch cases (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed.'
      ),
  })
  .describe('Extracted date range parameters from natural language query about cases');

export interface ParsedCasesQuery {
  start?: string;
  end?: string;
}

export async function parseCasesQuery({
  nlQuery,
  model,
  logger,
}: {
  nlQuery: string;
  model: ScopedModel;
  logger: Logger;
}): Promise<ParsedCasesQuery> {
  // Create a structured output model
  const structuredModel = model.chatModel.withStructuredOutput(casesQueryParamsSchema, {
    name: 'extract_cases_date_range',
  });

  const response = await structuredModel.invoke([
    {
      role: 'system',
      content: `You are an expert at extracting date and time information from natural language queries about cases.

Your task is to analyze the user's natural language query and extract date/time range parameters for filtering cases.

You MUST call the 'extract_cases_date_range' tool to provide the extracted parameters. Do NOT respond with plain text.

Guidelines for date extraction:
- Extract start and end dates from phrases like "cases updated in the last week", "cases from November 2nd", "cases updated between X and Y"
- If only a single date is mentioned (e.g., "cases from November 2nd"), set start to that date at 00:00:00Z and end to the next day at 00:00:00Z
- For relative time periods (e.g., "last week", "past 7 days"), calculate the appropriate start date relative to now
- Always return dates in ISO 8601 format (e.g., "2025-11-02T00:00:00Z")
- If no year is specified in the query, assume the current year
- If only a start date is provided without an end date, leave end undefined (it will default to now)
- If no date information is found in the query, return empty object (both start and end undefined)

Examples:
- "cases updated in the last week" -> start: 7 days ago, end: undefined
- "cases from November 2nd" -> start: "2025-11-02T00:00:00Z", end: "2025-11-03T00:00:00Z"
- "cases updated between January 1st and January 15th" -> start: "2025-01-01T00:00:00Z", end: "2025-01-16T00:00:00Z"
- "recent cases" -> start: undefined, end: undefined (no specific date range)
- "cases updated today" -> start: today at 00:00:00Z, end: undefined`,
    },
    {
      role: 'user',
      content: nlQuery,
    },
  ]);

  return {
    start: response.start,
    end: response.end,
  };
}

