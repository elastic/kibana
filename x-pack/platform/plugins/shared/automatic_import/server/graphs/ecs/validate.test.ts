/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsTestState } from '../../../__jest__/fixtures/ecs_mapping';
import { ECS_RESERVED } from './constants';

import { EcsMappingState } from '../../types';
import {
  extractECSMapping,
  findDuplicateFields,
  findInvalidEcsFields,
  handleValidateMappings,
  removeReservedFields,
} from './validate';

describe('Testing ecs handler', () => {
  it('extractECSMapping()', async () => {
    const path: string[] = [];
    const value = {
      checkpoint: {
        firewall: {
          product: null,
          sequencenum: null,
          subject: null,
          ifdir: null,
          origin: {
            target: 'source.address',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          flags: null,
          sendtotrackerasadvancedauditlog: null,
          originsicname: null,
          version: null,
          administrator: {
            target: 'user.name',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
          foo: {
            target: null, // Invalid value , to be skipped
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
        },
      },
    };
    const output: Record<string, string[][]> = {};
    await extractECSMapping(path, value, output);
    expect(output).toEqual({
      'source.address': [['checkpoint', 'firewall', 'origin']],
      'user.name': [['checkpoint', 'firewall', 'administrator']],
    });
  });
});

describe('findInvalidEcsFields', () => {
  it('invalid: invalid ecs mapping', async () => {
    const ecsMappingInvalid = {
      mysql_enterprise: {
        audit: {
          test_array: null,
          bytes: {
            target: 'myField.bytes',
            confidence: 0.99,
            type: 'number',
            date_formats: [],
          },
        },
      },
    };

    const invalid = findInvalidEcsFields(ecsMappingInvalid);
    expect(invalid.length).toBe(1);
  });

  it('invalid: reserved ecs field', async () => {
    const ecsMappingReserved = {
      mysql_enterprise: {
        audit: {
          test_array: null,
          type: {
            target: 'event.type',
            confidence: 'error',
            type: 'string',
            date_formats: [],
          },
        },
      },
    };

    const invalid = findInvalidEcsFields(ecsMappingReserved);
    expect(invalid.length).toBe(1);
  });

  it('invalid: date_format fields (natural example)', async () => {
    const misspelledDateFormatMapping = {
      ai_postgres_202410050058: {
        logs: {
          column1: {
            target: 'event.created',
            confidence: 0.9,
            type: 'date',
            date_format: ['yyyy-MM-dd HH:mm:ss.SSS z'],
          },
          column12: {
            target: 'log.level',
            confidence: 0.95,
            type: 'string',
            date_format: [],
          },
          column11: null,
          column4: null,
          column9: {
            target: 'event.start',
            confidence: 0.8,
            type: 'date',
            date_format: ['yyyy-MM-dd HH:mm:ss z'],
          },
          column7: null,
          column6: null,
          column14: {
            target: 'event.reason',
            confidence: 0.7,
            type: 'string',
            date_format: [],
          },
          column13: null,
          column24: {
            target: 'process.name',
            confidence: 0.85,
            type: 'string',
            date_format: [],
          },
          column23: null,
          column10: null,
          column5: {
            target: 'source.address',
            confidence: 0.9,
            type: 'string',
            date_format: [],
          },
          column3: {
            target: 'user.name',
            confidence: 0.8,
            type: 'string',
            date_format: [],
          },
          column2: {
            target: 'destination.user.name',
            confidence: 0.7,
            type: 'string',
            date_format: [],
          },
          column8: null,
        },
      },
    };

    const invalid = findInvalidEcsFields(misspelledDateFormatMapping);
    expect(invalid.length).toBe(1);
  });

  it('invalid: date_format fields (handcrafted example)', async () => {
    const mixedMapping = {
      some_title: {
        logs: {
          column1: {
            target: 'event.created',
            confidence: 0.9,
            type: 'date',
            date_format: ['yyyy-MM-dd HH:mm:ss.SSS z'],
          },
          column12: {
            target: 'log.level',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          column11: null,
          column4: null,
          column9: {
            target: 'event.start',
            confidence: 0.8,
            type: 'date',
            date_format: 'yyyy-MM-dd HH:mm:ss z',
          },
          column2: {
            target: 'destination.user.name',
            type: 'string',
            date_format: [],
          },
        },
      },
    };
    const invalid = findInvalidEcsFields(mixedMapping);
    expect(invalid.length).toBe(1);
  });
});

describe('findDuplicateFields', () => {
  it('duplicates: samples with duplicates', async () => {
    const finalMapping = {
      teleport_log: {
        audit: {
          ei: null,
          event: {
            target: 'event.action',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          uid: {
            target: 'event.action',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
        },
      },
    };
    const samples = [
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"8c815e54-c83b-43d7-b578-2bcf5b6775fa","code":"T1000W","time":"2024-05-09T20:58:57.77Z","cluster_name":"teleport.ericbeahan.com","user":"root","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52457"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"6bf237a0-2753-418d-b01b-2d82ebf42636","code":"T1000W","time":"2024-05-09T21:00:22.747Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52818"}}}',
    ];
    const duplicates = findDuplicateFields(samples, finalMapping);
    expect(duplicates).toStrictEqual([
      "One or more samples have matching fields for ECS field 'event.action': teleport_log.audit.event, teleport_log.audit.uid",
    ]);
  });
});

describe('removeReservedFields', () => {
  it('should remove reserved fields from the mapping', () => {
    const ecsMapping = {
      'ecs.version': 'Version',
      'event.category': 'Category',
      'source.ip': 'IP',
    };

    const expectedMapping = {
      'source.ip': 'IP',
    };

    const result = removeReservedFields(ecsMapping);
    expect(result).toEqual(expectedMapping);
  });

  it('should remove all fields if all are reserved', () => {
    const ecsMapping = Object.fromEntries(ECS_RESERVED.map((key) => [key, key]));
    const result = removeReservedFields(ecsMapping);
    expect(result).toEqual({});
  });

  it('should return the same mapping if there are no reserved fields', () => {
    const ecsMapping = {
      'source.ip': 'Some IP',
      'destination.ip': 'Another IP',
    };

    const result = removeReservedFields(ecsMapping);
    expect(result).toEqual(ecsMapping);
  });

  it('should handle an empty mapping', () => {
    const ecsMapping = {};

    const result = removeReservedFields(ecsMapping);
    expect(result).toEqual({});
  });

  it('should not modify the original mapping object', () => {
    const ecsMapping = {
      'ecs.version': 'Version',
      'source.ip': 'IP',
    };

    const ecsMappingCopy = { ...ecsMapping };

    const result = removeReservedFields(ecsMapping);
    expect(ecsMapping).toEqual(ecsMappingCopy);
    expect(ecsMapping).not.toEqual(result);
  });
});

describe('handleValidateMappings', () => {
  it('should return empty missing fields if none found', () => {
    const state: EcsMappingState = ecsTestState;
    state.currentMapping = {
      test: {
        test: {
          event: { target: 'event.action', confidence: 0.95, type: 'string' },
        },
      },
    };
    state.combinedSamples = JSON.stringify({
      test: {
        test: {
          event: 'cert.create',
        },
      },
    });
    const { missingKeys } = handleValidateMappings({ state });

    expect(missingKeys).toEqual([]);
  });

  it('should return missing fields list if any', () => {
    const state: EcsMappingState = ecsTestState;
    state.currentMapping = {
      test: {
        test: {
          event: { target: 'event.action', confidence: 0.95, type: 'string' },
        },
      },
    };
    state.combinedSamples = JSON.stringify({
      test: {
        test: {
          event: 'cert.create',
          version: '1',
        },
      },
    });
    const { missingKeys } = handleValidateMappings({ state });

    expect(missingKeys).toEqual(['test.test.version']);
  });
});
