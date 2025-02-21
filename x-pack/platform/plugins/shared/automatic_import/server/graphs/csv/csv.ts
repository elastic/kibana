/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LogFormatDetectionState } from '../../types';
import type { LogDetectionNodeParams } from '../log_type_detection/types';
import { createJSONInput } from '../../util';
import type { ESProcessorItem } from '../../../common';
import { createCSVProcessor, createDropProcessor } from '../../util/processors';
import { CSVParseError, UnparseableCSVFormatError } from '../../lib/errors/unparseable_csv_error';
import {
  generateColumnNames,
  upperBoundForColumnCount,
  columnsFromHeader,
  toSafeColumnName,
  totalColumnCount,
  yieldUniqueColumnNames,
  prefixColumns,
} from './columns';

// We will only create the processor for the first MAX_CSV_COLUMNS columns.
const MAX_CSV_COLUMNS = 100;

// Converts CSV samples into JSON samples.
export async function handleCSV({
  state,
  client,
}: LogDetectionNodeParams): Promise<Partial<LogFormatDetectionState>> {
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  const samples = state.logSamples;
  const temporaryColumns = generateColumnNames(
    Math.min(upperBoundForColumnCount(samples), MAX_CSV_COLUMNS)
  );
  const temporaryProcessor = createCSVProcessor('message', temporaryColumns);

  const { pipelineResults: tempResults, errors: tempErrors } = await createJSONInput(
    [temporaryProcessor],
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
  if (state.samplesFormat.header) {
    const headerResults = tempResults[0];
    headerColumns.push(...columnsFromHeader(temporaryColumns, headerResults));
  }

  // Combine all that information into a single list of columns
  const columns: string[] = Array.from(
    yieldUniqueColumnNames(
      totalColumnCount(temporaryColumns, tempResults),
      [llmProvidedColumns, headerColumns],
      temporaryColumns
    )
  );

  // Instantiate the processors to handle the CSV format
  const dropProcessors: ESProcessorItem[] = [];
  if (state.samplesFormat.header) {
    const headerResults = tempResults[0];
    const dropValues = columns.reduce((acc, column, index) => {
      const headerValue = headerResults[temporaryColumns[index]];
      if (typeof headerValue === 'string') {
        acc[column] = headerValue;
      }
      return acc;
    }, {} as Record<string, string>);

    const dropProcessor = createDropProcessor(
      dropValues,
      prefix,
      'remove_csv_header',
      'Remove the CSV header line by comparing the values'
    );
    dropProcessors.push(dropProcessor);
  }
  const prefixedColumns = prefixColumns(columns, prefix);
  const csvHandlingProcessors = [createCSVProcessor('message', prefixedColumns), ...dropProcessors];

  // Test the processors on the samples provided
  const { pipelineResults: finalResults, errors: finalErrors } = await createJSONInput(
    csvHandlingProcessors,
    samples,
    client
  );

  if (finalErrors.length > 0) {
    throw new UnparseableCSVFormatError(finalErrors as CSVParseError[]);
  }

  // Converts JSON Object into a string and parses it as a array of JSON strings
  const jsonSamples = finalResults
    .map((log) => log[packageName])
    .map((log) => (log as Record<string, unknown>)[dataStreamName])
    .map((log) => JSON.stringify(log));

  return {
    jsonSamples,
    additionalProcessors: [...state.additionalProcessors, ...csvHandlingProcessors],
    lastExecutedChain: 'handleCSV',
  };
}
