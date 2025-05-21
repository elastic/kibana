/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { csvToIngestPipeline } from './mapper';
import { FieldCopyAction } from '../../common/types';

describe('mapper', () => {
  describe('csvToIngestPipeline()', () => {
    it('empty file returns empty mapping', () => {
      expect(() => {
        csvToIngestPipeline('', FieldCopyAction.Copy);
      }).toThrow(new Error('Error reading file: The file provided is empty.'));
    });

    it('file parsing error for invalid csv', () => {
      const invalidCsv = `name,number
      one|1
      two.2
      fourty two,42`;

      expect(() => {
        csvToIngestPipeline(invalidCsv, FieldCopyAction.Copy);
      }).toThrow(
        new Error(
          'Error reading file: An unexpected issue has occured during the processing of the file.'
        )
      );
    });

    describe('missing the required headers errors', () => {
      it('single missing headers', () => {
        const noHeadersCsv =
          'test_header,copy_action,format_action,timestamp_format,destination_field,Notes\nsrcip,,,,source.address,Copying srcip to source.address';

        expect(() => {
          csvToIngestPipeline(noHeadersCsv, FieldCopyAction.Copy);
        }).toThrow(
          new Error('Missing required headers: Include source_field header in the CSV file.')
        );
      });

      it('multiple missing headers', () => {
        const noHeadersCsv = 'srcip,,,,source.address,Copying srcip to source.address';

        expect(() => {
          csvToIngestPipeline(noHeadersCsv, FieldCopyAction.Copy);
        }).toThrow(
          new Error(
            'Missing required headers: Include source_field, destination_field headers in the CSV file.'
          )
        );
      });
    });

    it('unacceptable format action errors', () => {
      const badFormatCsv =
        'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsrcport,,invalid_action,,source.port,\n';

      expect(() => {
        csvToIngestPipeline(badFormatCsv, FieldCopyAction.Copy);
      }).toThrow(
        new Error(
          'Invalid format action [invalid_action]. The valid actions are uppercase, lowercase, to_boolean, to_integer, to_float, to_array, to_string, parse_timestamp'
        )
      );
    });

    describe('successful mapping', () => {
      it('duplicate row handled', () => {
        const duplciateRow =
          'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsrcip,,,,source.address,Copying srcip to source.address\nsrcip,,,,source.address,Copying srcip to source.address\n';
        const expectedJson = {
          processors: [
            {
              set: {
                field: 'source.address',
                if: 'ctx.srcip != null',
                value: '{{srcip}}',
              },
            },
          ],
        };
        expect(csvToIngestPipeline(duplciateRow, FieldCopyAction.Copy)).toEqual(expectedJson);
      });

      describe('timestamp formatting', () => {
        it('default handling', () => {
          const defaultTimestamp =
            'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsome_timestamp,,,,@timestamp,\n';

          const expectedJson = {
            processors: [
              {
                date: {
                  field: 'some_timestamp',
                  formats: ['UNIX_MS'],
                  timezone: 'UTC',
                  target_field: '@timestamp',
                  ignore_failure: true,
                },
              },
            ],
          };
          expect(csvToIngestPipeline(defaultTimestamp, FieldCopyAction.Copy)).toEqual(expectedJson);
        });

        it('specified handling', () => {
          const timestampSpecifics =
            'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsome_timestamp,,parse_timestamp,UNIX,destination_timestamp,\n';

          const expectedJson = {
            processors: [
              {
                date: {
                  field: 'some_timestamp',
                  formats: ['UNIX'],
                  timezone: 'UTC',
                  target_field: 'destination_timestamp',
                  ignore_failure: true,
                },
              },
            ],
          };
          expect(csvToIngestPipeline(timestampSpecifics, FieldCopyAction.Copy)).toEqual(
            expectedJson
          );
        });
      });

      describe('field copy action', () => {
        it('copy', () => {
          const copyFile =
            'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nts,copy,,,timestamp,\n';

          const expectedJson = {
            processors: [
              {
                set: {
                  field: 'timestamp',
                  value: '{{ts}}',
                  if: 'ctx.ts != null',
                },
              },
            ],
          };
          expect(csvToIngestPipeline(copyFile, FieldCopyAction.Rename)).toEqual(expectedJson);
        });
        it('rename', () => {
          const renameFile =
            'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nhostip,,to_array,,host.ip,\n';

          const expectedJson = {
            processors: [
              {
                rename: {
                  field: 'hostip',
                  target_field: 'host.ip',
                  ignore_missing: true,
                },
              },
              {
                append: {
                  field: 'host.ip',
                  value: [],
                  ignore_failure: true,
                  if: 'ctx.host?.ip != null',
                },
              },
            ],
          };
          expect(csvToIngestPipeline(renameFile, FieldCopyAction.Rename)).toEqual(expectedJson);
        });
      });

      it('successful mapping example file', () => {
        const validCsv =
          'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\n' +
          'srcip,,,,source.address,Copying srcip to source.address\n' +
          'new_event.srcip,,,,source.ip,\n' +
          'some_timestamp_field,,parse_timestamp,,@timestamp,\n' +
          'srcport,rename,to_integer,,source.port,\n' +
          'log_level,rename,uppercase,,log.level,\n' +
          'hostip,,to_array,,host.ip,\n';

        const expectedJson = {
          processors: [
            {
              set: {
                field: 'source.address',
                if: 'ctx.srcip != null',
                value: '{{srcip}}',
              },
            },
            {
              set: {
                field: 'source.ip',
                value: '{{new_event.srcip}}',
                if: 'ctx.new_event?.srcip != null',
              },
            },
            {
              date: {
                field: 'some_timestamp_field',
                target_field: '@timestamp',
                formats: ['UNIX_MS'],
                timezone: 'UTC',
                ignore_failure: true,
              },
            },
            {
              rename: {
                field: 'srcport',
                target_field: 'source.port',
                ignore_missing: true,
              },
            },
            {
              convert: {
                field: 'source.port',
                type: 'long',
                ignore_missing: true,
                ignore_failure: true,
              },
            },
            {
              rename: {
                field: 'log_level',
                target_field: 'log.level',
                ignore_missing: true,
              },
            },
            {
              uppercase: {
                field: 'log.level',
                ignore_missing: true,
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'host.ip',
                value: '{{hostip}}',
                if: 'ctx.hostip != null',
              },
            },
            {
              append: {
                field: 'host.ip',
                value: [],
                ignore_failure: true,
                if: 'ctx.host?.ip != null',
              },
            },
          ],
        };
        expect(csvToIngestPipeline(validCsv, FieldCopyAction.Copy)).toEqual(expectedJson);
      });
    });
  });
});
