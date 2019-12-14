/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';

import { Importer } from './importer';
import Papa from 'papaparse';

export class CsvImporter extends Importer {
  constructor(results, settings) {
    super(settings);

    this.format = results.format;
    this.delimiter = results.delimiter;
    this.quote = results.quote;
    this.hasHeaderRow = results.has_header_row;
    this.columnNames = results.column_names;
    this.shouldTrimFields = results.should_trim_fields || false;
  }

  async read(csv) {
    try {
      const transform = this.shouldTrimFields ? f => f.trim() : f => f;
      const dynamicTyping = c => shouldUseDynamicType(this.columnNames, this.mappings, c);
      const config = {
        header: false,
        skipEmptyLines: 'greedy',
        delimiter: this.delimiter,
        quoteChar: this.quote,
        transform,
        dynamicTyping,
      };

      const parserOutput = Papa.parse(csv, config);

      if (parserOutput.errors.length) {
        // throw an error with the message of the first error encountered
        throw parserOutput.errors[0].message;
      }

      this.data = parserOutput.data;

      if (this.hasHeaderRow) {
        this.data.shift();
      }

      this.docArray = formatToJson(this.data, this.columnNames);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}

// parse numeric and boolean fields - treat everything else as a string
function shouldUseDynamicType(columnNames, mappings, columnNumber) {
  if (columnNumber >= columnNames.length) {
    return false;
  }
  const columnMapping = mappings[columnNames[columnNumber]];
  if (columnMapping === undefined || columnMapping.type === undefined) {
    return false;
  }
  switch (columnMapping.type) {
    case ES_FIELD_TYPES.BOOLEAN:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.BYTE:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
      return true;
    default:
      return false;
  }
}

function formatToJson(data, columnNames) {
  const docArray = [];
  for (let i = 0; i < data.length; i++) {
    const line = {};
    for (let c = 0; c < columnNames.length; c++) {
      const col = columnNames[c];
      if (data[i][c] !== null && data[i][c] !== '') {
        line[col] = data[i][c];
      }
    }
    docArray.push(line);
  }
  return docArray;
}
