/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fs from 'fs';
import { RequestHandlerContext } from 'kibana/server';
import os from 'os';
import util from 'util';

const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

export interface InputData {
  [key: string]: any;
}

export interface InputOverrides {
  [key: string]: string;
}

export type FormattedOverrides = InputOverrides & {
  column_names: string[];
  has_header_row: boolean;
  should_trim_fields: boolean;
};

export interface AnalysisResult {
  /**
   * Indicates if the result has been cached
   */
  cached: boolean;
  results: {
    charset: string;
    has_header_row: boolean;
    has_byte_order_marker: boolean;
    format: string;
    field_stats: {
      [fieldName: string]: {
        count: number;
        cardinality: number;
        top_hits: Array<{ count: number; value: any }>;
      };
    };
    sample_start: string;
    num_messages_analyzed: number;
    mappings: {
      [fieldName: string]: {
        type: string;
      };
    };
    quote: string;
    delimiter: string;
    need_client_timezone: boolean;
    num_lines_analyzed: number;
    column_names: string[];
  };
}

export function fileDataVisualizerProvider(context: RequestHandlerContext) {
  async function analyzeFile(data: any, overrides: any): Promise<AnalysisResult> {
    let cached = false;
    let results = [];

    try {
      results = await context.ml!.mlClient.callAsCurrentUser('ml.fileStructure', {
        body: data,
        ...overrides,
      });
      if (false) {
        // disabling caching for now
        cached = await cacheData(data);
      }
    } catch (error) {
      const err = error.message !== undefined ? error.message : error;
      throw Boom.badRequest(err);
    }

    const { hasOverrides, reducedOverrides } = formatOverrides(overrides);

    return {
      ...(hasOverrides && { overrides: reducedOverrides }),
      cached,
      results,
    };
  }

  async function cacheData(data: InputData) {
    const outputPath = `${os.tmpdir()}/kibana-ml`;
    const tempFile = 'es-ml-tempFile';
    const tempFilePath = `${outputPath}/${tempFile}`;

    try {
      createOutputDir(outputPath);
      await deleteOutputFiles(outputPath);
      await writeFile(tempFilePath, data);
      return true;
    } catch (error) {
      return false;
    }
  }

  function createOutputDir(dir: string) {
    if (fs.existsSync(dir) === false) {
      fs.mkdirSync(dir);
    }
  }

  async function deleteOutputFiles(outputPath: string) {
    const files = await readdir(outputPath);
    files.forEach(f => {
      fs.unlinkSync(`${outputPath}/${f}`);
    });
  }

  return {
    analyzeFile,
  };
}

function formatOverrides(overrides: InputOverrides) {
  let hasOverrides = false;

  const reducedOverrides: FormattedOverrides = Object.keys(overrides).reduce((acc, overrideKey) => {
    const overrideValue: string = overrides[overrideKey];
    if (overrideValue !== '') {
      acc[overrideKey] = overrideValue;

      if (overrideKey === 'column_names') {
        acc.column_names = overrideValue.split(',');
      }

      if (overrideKey === 'has_header_row') {
        acc.has_header_row = overrideValue === 'true';
      }

      if (overrideKey === 'should_trim_fields') {
        acc.should_trim_fields = overrideValue === 'true';
      }

      hasOverrides = true;
    }
    return acc;
  }, {} as FormattedOverrides);

  return {
    reducedOverrides,
    hasOverrides,
  };
}
