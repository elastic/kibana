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
 * Processes CSV log data and converts it to JSON for further pipeline execution.
 *
 * This function attempts to parse CSV-formatted samples with temporary columns names first.
 * If that is successful, the final column names are determined by combining the columns suggested by the LLM,
 * the columns parsed from the header row, and the temporary columns as the last resort.
 *
 * We generate necessary processors to handle the CSV format, including a processor to drop the header row if it exists.
 * The samples are then processed with these processors to convert them to JSON and stored in the state.
 *
 * @param param0 - An object containing the state, which holds log samples and format info, and the Elasticsearch client.
 * @returns A promise resolving to a partial state containing JSON samples, additional processors, and the last executed chain label.
 * @throws UnparseableCSVFormatError if CSV parsing fails for any log samples.
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
