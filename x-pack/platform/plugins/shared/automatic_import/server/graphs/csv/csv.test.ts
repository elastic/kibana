/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { handleCSV } from './csv';
import { ESProcessorItem } from '../../../common';
import { DocTemplate } from '../../util/pipeline';

interface SimpleCSVPipelineSimulationParams {
  pipeline: { processors: ESProcessorItem[] };
  docs: DocTemplate[];
}

/**
 * Simulates processing a list of documents with a defined pipeline of processors,
 * specifically handling 'csv' and 'drop' processors in the way they are used in our CSV processing.
 *
 * @param params - An object containing the pipeline of processors and the documents to be transformed.
 * @returns An object containing the processed list of documents after all processors in the pipeline have been applied.
 */
export const simpleCSVPipelineSimulation = (
  params: SimpleCSVPipelineSimulationParams
): { docs: Array<{ doc: DocTemplate }> } => {
  const { pipeline, docs } = params;
  for (const processor of pipeline.processors) {
    if ('remove' in processor) {
      // do nothing
    } else if ('csv' in processor) {
      // Not a real CSV parser, of course. It only handles the "json.*" field names.
      const fields = processor.csv.target_fields as string[];
      for (const doc of docs) {
        const message = doc._source.message;
        const values = message.split(',');
        const unpacked: Record<string, unknown> = {};
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i].startsWith('json.') ? fields[i].slice(5) : fields[i];
          // The only error it handles is: CSV value starts with " and does not end with ".
          if (values[i].startsWith('"') && !values[i].endsWith('"')) {
            throw new Error('Mismatched quote');
          }
          unpacked[field] = values[i].startsWith('"') ? values[i].slice(1, -1) : values[i];
        }
        // eslint-disable-next-line dot-notation
        doc._source['json'] = unpacked;
      }
    } else if ('drop' in processor) {
      docs.shift();
    } else {
      throw new Error('Unknown processor');
    }
  }
  return { docs: docs.map((doc) => ({ doc })) };
};

describe('handleCSV', () => {
  const mockClient = {
    asCurrentUser: {
      ingest: {
        simulate: simpleCSVPipelineSimulation,
      },
    },
  } as unknown as IScopedClusterClient;

  it('should successfully parse valid CSV logs without header', async () => {
    const mockParams = {
      state: {
        packageName: 'testPackage',
        dataStreamName: 'testDataStream',
        logSamples: ['123,"string",456', '"123",Some Value,"456"'],
        samplesFormat: {
          columns: [],
          header: false,
        },
        additionalProcessors: [],
      },
      client: mockClient,
    };

    const result = await handleCSV(mockParams);
    expect(result.jsonSamples).toBeDefined();
    expect(result.additionalProcessors).toHaveLength(1); // Must be CSV and drop processor
    if (!result.additionalProcessors) {
      fail('additionalProcessors is undefined, logic error after expectation');
    }

    const csvProcessor = result.additionalProcessors[0].csv;
    expect(csvProcessor).toBeDefined();
    expect(csvProcessor.target_fields).toEqual([
      'testPackage.testDataStream.column1',
      'testPackage.testDataStream.column2',
      'testPackage.testDataStream.column3',
    ]);
    expect(result.jsonSamples).toEqual([
      '{"column1":"123","column2":"string","column3":"456"}',
      '{"column1":"123","column2":"Some Value","column3":"456"}',
    ]);
    expect(result.lastExecutedChain).toBe('handleCSV');
  });

  it('should successfully parse valid CSV logs with header', async () => {
    const mockParams = {
      state: {
        packageName: 'testPackage',
        dataStreamName: 'testDataStream',
        logSamples: ['header1,header2,header3', 'value1,value2,value3'],
        samplesFormat: {
          columns: ['first column', 'second column'],
          header: true,
        },
        additionalProcessors: [],
      },
      client: mockClient,
    };

    const result = await handleCSV(mockParams);
    expect(result.jsonSamples).toBeDefined();
    expect(result.additionalProcessors).toHaveLength(2); // Must be CSV and drop processor
    if (!result.additionalProcessors) {
      fail('additionalProcessors is undefined, logic error after expectation');
    }
    const csvProcessor = result.additionalProcessors[0].csv;
    expect(csvProcessor).toBeDefined();
    expect(csvProcessor.target_fields).toEqual([
      'testPackage.testDataStream.first_column',
      'testPackage.testDataStream.second_column',
      'testPackage.testDataStream.header3',
    ]);
    const dropProcessor = result.additionalProcessors[1].drop;
    expect(dropProcessor).toBeDefined();
    expect(dropProcessor.if).toContain('header1'); // column value, not column name!
    expect(result.lastExecutedChain).toBe('handleCSV');
  });

  it('should throw UnparseableCSVFormatError when CSV parsing fails', async () => {
    const mockParams = {
      state: {
        packageName: 'testPackage',
        dataStreamName: 'testDataStream',
        // Intentionally malformed according to our simple CSV parser
        logSamples: ['header1,header2', '"values...'],
        samplesFormat: {
          columns: ['col1', 'col2'],
          header: true,
        },
        additionalProcessors: [],
      },
      client: mockClient,
    };
    await expect(handleCSV(mockParams)).rejects.toThrow('unparseable-csv-data');
  });
});
