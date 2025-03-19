/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import type { LogFormatDetectionState } from '../../types';
import { createJSONInput } from '../../util';
import type { ESProcessorItem } from '../../../common';
import { createCSVProcessor, createDropProcessor } from '../../util/processors';
import { CSVParseError, UnparseableCSVFormatError } from '../../lib/errors/unparseable_csv_error';
import {
  generateColumnNames,
  upperBoundForColumnCount,
  columnsFromHeader,
  valuesFromHeader,
  toSafeColumnName,
  totalColumnCount,
  yieldUniqueColumnNames,
  prefixColumns,
} from './columns';

// We will only create the processor for the first MAX_CSV_COLUMNS columns.
const MAX_CSV_COLUMNS = 100;

interface HandleCSVState {
  packageName: string;
  dataStreamName: string;
  logSamples: string[];
  samplesFormat: {
    columns?: string[];
    header?: boolean;
  };
  additionalProcessors: ESProcessorItem[];
}

interface HandleCSVParams {
  state: HandleCSVState;
  client: IScopedClusterClient;
}

function createCSVPipeline(
  prefix: string[],
  columns: string[],
  headerValues: Array<string | number | undefined>
): ESProcessorItem[] {
  const prefixedColumns = prefixColumns(columns, prefix);
  const dropProcessors: ESProcessorItem[] = [];

  if (headerValues.length !== 0) {
    const dropValues = columns.reduce((acc, column, index) => {
      const headerValue = headerValues[index];
      if (headerValue !== undefined) {
        acc[column] = headerValue;
      }
      return acc;
    }, {} as Record<string, string | number>);

    const dropProcessor = createDropProcessor(
      dropValues,
      prefix,
      'remove_csv_header',
      'Remove the CSV header by comparing row values to the header row.'
    );
    dropProcessors.push(dropProcessor);
  }

  return [createCSVProcessor('message', prefixedColumns), ...dropProcessors];
}

/**
 * Processes CSV log data by parsing, testing, and converting to JSON format.
 *
 * The process follows three stages:
 * 1. Initial parsing with temporary column names (column1, column2, etc.)
 * 2. Testing with actual pipeline using package.dataStream.columnName format
 * 3. Converting to JSON format for further processing
 *
 * Final column names are determined by combining LLM suggestions, header row parsing,
 * and temporary columns as fallback. Includes header row handling and CSV-to-JSON conversion.
 *
 * @param param0 - Object containing state (log samples, format info) and Elasticsearch client
 * @returns Promise with JSON samples, processors, and chain label
 * @throws UnparseableCSVFormatError if CSV parsing fails
 */
export async function handleCSV({
  state,
  client,
}: HandleCSVParams): Promise<Partial<LogFormatDetectionState>> {
  const jsonKey = 'json';
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  const samples = state.logSamples;
  const temporaryColumns = generateColumnNames(
    Math.min(upperBoundForColumnCount(samples), MAX_CSV_COLUMNS)
  );
  const temporaryPipeline = createCSVPipeline([jsonKey], temporaryColumns, []);

  const { pipelineResults: tempResults, errors: tempErrors } = await createJSONInput(
    temporaryPipeline,
    samples,
    client
  );

  if (tempErrors.length > 0) {
    throw new UnparseableCSVFormatError(tempErrors as CSVParseError[]);
  }

  // Some basic information we'll need later
  const prefix = [packageName, dataStreamName];

  // What columns does the LLM suggest?
  const llmProvidedColumns = (state.samplesFormat.columns || []).map(toSafeColumnName);

  // What columns do we get by parsing the header row, if any exists?
  const headerColumns: Array<string | undefined> = [];
  const headerValues: Array<string | number | undefined> = [];
  const csvRows = tempResults.map((result) => result[jsonKey] as { [key: string]: unknown });

  if (state.samplesFormat.header) {
    const headerRow = csvRows[0];
    headerValues.push(...valuesFromHeader(temporaryColumns, headerRow));
    headerColumns.push(...columnsFromHeader(temporaryColumns, headerRow));
  }

  // Combine all that information into a single list of columns
  const columns: string[] = Array.from(
    yieldUniqueColumnNames(
      totalColumnCount(temporaryColumns, csvRows),
      [llmProvidedColumns, headerColumns],
      temporaryColumns
    )
  );

  // These processors extract CSV fields into a specific key.
  const csvHandlingProcessors = createCSVPipeline(prefix, columns, headerValues);

  // Test the processors on the samples provided
  const { errors } = await createJSONInput(csvHandlingProcessors, samples, client);

  if (errors.length > 0) {
    throw new UnparseableCSVFormatError(errors as CSVParseError[]);
  }

  // These processors extract CSV fields into a specific key.
  const csvToJSONProcessors = createCSVPipeline([jsonKey], columns, headerValues);

  const { pipelineResults: jsonResults, errors: jsonErrors } = await createJSONInput(
    csvToJSONProcessors,
    samples,
    client
  );

  if (jsonErrors.length > 0) {
    throw new UnparseableCSVFormatError(jsonErrors as CSVParseError[]);
  }

  const jsonSamples = jsonResults.map((log) => log[jsonKey]).map((log) => JSON.stringify(log));

  return {
    jsonSamples,
    additionalProcessors: [...state.additionalProcessors, ...csvHandlingProcessors],
    lastExecutedChain: 'handleCSV',
  };
}
