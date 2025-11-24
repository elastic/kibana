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
  try {
    // Create a structured output model
    const structuredModel = model.chatModel.withStructuredOutput(casesQueryParamsSchema, {
      name: 'extract_cases_date_range',
    });

    const response = await structuredModel.invoke([
      {
        role: 'system',
        content: `You are an expert at extracting date/time information from natural language queries about cases.

Your task is to analyze the user's natural language query and extract date/time range parameters for filtering cases.

You MUST call the 'extract_cases_date_range' tool to provide the extracted parameters. Do NOT respond with plain text.

IMPORTANT: Only return the fields defined in the schema (start and end). Do not return any other fields.

Guidelines for date extraction:
- Extract start and end dates from phrases like "cases updated in the last week", "cases from November 2nd", "cases updated between X and Y"
- If only a single date is mentioned (e.g., "cases from November 2nd"), set start to that date at 00:00:00Z and end to the next day at 00:00:00Z
- For relative time periods (e.g., "last week", "past 7 days"), calculate the appropriate start date relative to now
- Always return dates in ISO 8601 format (e.g., "2025-11-02T00:00:00Z")
- If no year is specified in the query, assume the current year
- If only a start date is provided without an end date, leave end undefined (it will default to now)
- If no date information is found in the query, leave start and end undefined (do not include them in the response)
- Ignore any alert ID mentions in the query - alert IDs must be provided via the alertIds parameter, not extracted from the query

Examples:
- "cases updated in the last week" -> { start: "2025-01-15T00:00:00Z" }
- "cases from November 2nd" -> { start: "2025-11-02T00:00:00Z", end: "2025-11-03T00:00:00Z" }
- "cases updated between January 1st and January 15th" -> { start: "2025-01-01T00:00:00Z", end: "2025-01-16T00:00:00Z" }
- "recent cases" -> {}
- "cases updated today" -> { start: "2025-01-22T00:00:00Z" }
- "cases with alert ID abc-123-def" -> {} (alert IDs are ignored, they must be provided via alertIds parameter)
- "Do I have any open security cases?" -> {}
- "open cases" -> {}`,
      },
      {
        role: 'user',
        content: nlQuery,
      },
    ]);

    // Ensure we only return the fields we expect
    return {
      start: response.start,
      end: response.end,
    };
  } catch (error) {
    logger.warn(
      `[Cases Tool] Failed to parse query for date ranges: ${error instanceof Error ? error.message : String(error)}. Using default date range.`
    );
    // Return empty result - will use default date range in normalizeTimeRange
    return {
      start: undefined,
      end: undefined,
    };
  }
}

