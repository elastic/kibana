/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetchMock from 'fetch-mock';
import {
  isMlStartJobError,
  MessageBody,
  parseJsonFromBody,
  throwIfErrorAttached,
  throwIfErrorAttachedToSetup,
  ToasterErrors,
  tryParseResponse,
} from './throw_if_not_ok';
import { SetupMlResponse } from '../../ml_popover/types';

describe('throw_if_not_ok', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  describe('#parseJsonFromBody', () => {
    test('parses a json from the body correctly', async () => {
      fetchMock.mock('http://example.com', {
        status: 500,
        body: {
          error: 'some error',
          statusCode: 500,
          message: 'I am a custom message',
        },
      });
      const response = await fetch('http://example.com');
      const expected: MessageBody = {
        error: 'some error',
        statusCode: 500,
        message: 'I am a custom message',
      };
      await expect(parseJsonFromBody(response)).resolves.toEqual(expected);
    });

    test('returns null if the body does not exist', async () => {
      fetchMock.mock('http://example.com', { status: 500, body: 'some text' });
      const response = await fetch('http://example.com');
      await expect(parseJsonFromBody(response)).resolves.toEqual(null);
    });
  });

  describe('#tryParseResponse', () => {
    test('It formats a JSON object', () => {
      const parsed = tryParseResponse(JSON.stringify({ hello: 'how are you?' }));
      expect(parsed).toEqual('{\n  "hello": "how are you?"\n}');
    });

    test('It returns a string as is if that string is not JSON', () => {
      const parsed = tryParseResponse('some string');
      expect(parsed).toEqual('some string');
    });
  });

  describe('#isMlErrorMsg', () => {
    test('It returns true for a ml error msg json', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          msg: 'some message',
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlStartJobError(json)).toEqual(true);
    });

    test('It returns false to a ml error msg if it is missing msg', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlStartJobError(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing response', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlStartJobError(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing statusCode', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          msg: 'some message',
          response: 'some response',
        },
      };
      expect(isMlStartJobError(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing error completely', () => {
      const json: Record<string, Record<string, unknown>> = {};
      expect(isMlStartJobError(json)).toEqual(false);
    });
  });

  describe('#throwIfErrorAttached', () => {
    test('It throws if an error is attached', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: 'some response',
            statusCode: 400,
          },
        },
      };
      expect(() => throwIfErrorAttached(json, ['some-id'])).toThrow(
        new ToasterErrors(['some message'])
      );
    });

    test('It throws if an error is attached and has all the messages expected', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: 'some response',
            statusCode: 400,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id']);
      } catch (error) {
        expect(error.messages).toEqual(['some message', 'some response', 'Status Code: 400']);
      }
    });

    test('It throws if an error with the response parsed correctly', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: JSON.stringify({ hello: 'how are you?' }),
            statusCode: 400,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id']);
      } catch (error) {
        expect(error.messages).toEqual([
          'some message',
          '{\n  "hello": "how are you?"\n}',
          'Status Code: 400',
        ]);
      }
    });

    test('It throws if an error is attached and has all the messages expected with multiple ids', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id-1': {
          error: {
            msg: 'some message 1',
            response: 'some response 1',
            statusCode: 400,
          },
        },
        'some-id-2': {
          error: {
            msg: 'some message 2',
            response: 'some response 2',
            statusCode: 500,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id-1', 'some-id-2']);
      } catch (error) {
        expect(error.messages).toEqual([
          'some message 1',
          'some response 1',
          'Status Code: 400',
          'some message 2',
          'some response 2',
          'Status Code: 500',
        ]);
      }
    });

    test('It throws if an error is attached and has all the messages expected with multiple ids but only one valid one is given', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id-1': {
          error: {
            msg: 'some message 1',
            response: 'some response 1',
            statusCode: 400,
          },
        },
        'some-id-2': {
          error: {
            msg: 'some message 2',
            response: 'some response 2',
            statusCode: 500,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id-1', 'some-id-not-here']);
      } catch (error) {
        expect(error.messages).toEqual(['some message 1', 'some response 1', 'Status Code: 400']);
      }
    });
  });

  describe('#throwIfErrorAttachedToSetup', () => {
    test('It throws an error if setupJob has multiple errors', async () => {
      const json: SetupMlResponse = {
        jobs: [
          {
            id: 'siem-api-suspicious_login_activity_ecs',
            success: false,
            error: {
              msg:
                '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
              path: '/_ml/anomaly_detectors/siem-api-suspicious_login_activity_ecs',
              query: {},
              body:
                '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Detect unusually high number of authentication attempts (beta)","groups":["siem"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"high number of authentication attempts","function":"high_non_zero_count","partition_field_name":"host.name"}],"influencers":["host.name","user.name","source.ip"]},"analysis_limits":{"model_memory_limit":"256mb"},"data_description":{"time_field":"@timestamp","time_format":"epoch_ms"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"IP Address Details","url_value":"siem#/ml-network/ip/$source.ip$?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]}}',
              statusCode: 400,
              response:
                '{"error":{"root_cause":[{"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"}],"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index","caused_by":{"type":"illegal_argument_exception","reason":"mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"}},"status":400}',
            },
          },
          {
            id: 'siem-api-rare_process_linux_ecs',
            success: false,
            error: {
              msg:
                '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
              path: '/_ml/anomaly_detectors/siem-api-rare_process_linux_ecs',
              query: {},
              body:
                '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Detect unusually rare processes on Linux (beta)","groups":["siem"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"rare process executions on Linux","function":"rare","by_field_name":"process.name","partition_field_name":"host.name"}],"influencers":["host.name","process.name","user.name"]},"analysis_limits":{"model_memory_limit":"256mb"},"data_description":{"time_field":"@timestamp","time_format":"epoch_ms"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"Host Details by process name","url_value":"siem#/ml-hosts/$host.name$?query=(query:\'process.name%20:%20%22$process.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Host Details by user name","url_value":"siem#/ml-hosts/$host.name$?query=(query:\'user.name%20:%20%22$user.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by process name","url_value":"siem#/ml-hosts?query=(query:\'process.name%20:%20%22$process.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by user name","url_value":"siem#/ml-hosts?query=(query:\'user.name%20:%20%22$user.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]}}',
              statusCode: 400,
              response:
                '{"error":{"root_cause":[{"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"}],"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index","caused_by":{"type":"illegal_argument_exception","reason":"mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"}},"status":400}',
            },
          },
        ],
        datafeeds: [
          {
            id: 'datafeed-siem-api-rare_process_linux_ecs',
            success: false,
            started: false,
            error: {
              msg:
                "[resource_not_found_exception] No known job with id 'siem-api-rare_process_linux_ecs'",
              path: '/_ml/datafeeds/datafeed-siem-api-rare_process_linux_ecs',
              query: {},
              body:
                '{"job_id":"siem-api-rare_process_linux_ecs","indexes":["auditbeat-*"],"query":{"bool":{"filter":[{"terms":{"event.action":["process_started","executed"]}}]}}}',
              statusCode: 404,
              response:
                '{"error":{"root_cause":[{"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-rare_process_linux_ecs\'"}],"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-rare_process_linux_ecs\'"},"status":404}',
            },
          },
          {
            id: 'datafeed-siem-api-suspicious_login_activity_ecs',
            success: false,
            started: false,
            error: {
              msg:
                "[resource_not_found_exception] No known job with id 'siem-api-suspicious_login_activity_ecs'",
              path: '/_ml/datafeeds/datafeed-siem-api-suspicious_login_activity_ecs',
              query: {},
              body:
                '{"job_id":"siem-api-suspicious_login_activity_ecs","indexes":["auditbeat-*"],"query":{"bool":{"filter":{"term":{"event.category":"authentication"}}}}}',
              statusCode: 404,
              response:
                '{"error":{"root_cause":[{"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-suspicious_login_activity_ecs\'"}],"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-suspicious_login_activity_ecs\'"},"status":404}',
            },
          },
        ],
        kibana: {},
      };
      try {
        throwIfErrorAttachedToSetup(json);
      } catch (error) {
        expect(error.messages).toEqual([
          '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "status_exception",\n        "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"\n      }\n    ],\n    "type": "status_exception",\n    "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index",\n    "caused_by": {\n      "type": "illegal_argument_exception",\n      "reason": "mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"\n    }\n  },\n  "status": 400\n}',
          'Status Code: 400',
          '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "status_exception",\n        "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"\n      }\n    ],\n    "type": "status_exception",\n    "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index",\n    "caused_by": {\n      "type": "illegal_argument_exception",\n      "reason": "mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"\n    }\n  },\n  "status": 400\n}',
          'Status Code: 400',
          "[resource_not_found_exception] No known job with id 'siem-api-rare_process_linux_ecs'",
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "resource_not_found_exception",\n        "reason": "No known job with id \'siem-api-rare_process_linux_ecs\'"\n      }\n    ],\n    "type": "resource_not_found_exception",\n    "reason": "No known job with id \'siem-api-rare_process_linux_ecs\'"\n  },\n  "status": 404\n}',
          'Status Code: 404',
          "[resource_not_found_exception] No known job with id 'siem-api-suspicious_login_activity_ecs'",
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "resource_not_found_exception",\n        "reason": "No known job with id \'siem-api-suspicious_login_activity_ecs\'"\n      }\n    ],\n    "type": "resource_not_found_exception",\n    "reason": "No known job with id \'siem-api-suspicious_login_activity_ecs\'"\n  },\n  "status": 404\n}',
          'Status Code: 404',
        ]);
      }
    });

    test('It throws an error if only jobs has errors', async () => {
      const json: SetupMlResponse = {
        jobs: [
          {
            id: 'siem-api-suspicious_login_activity_ecs',
            success: false,
            error: {
              msg:
                '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
              path: '/_ml/anomaly_detectors/siem-api-suspicious_login_activity_ecs',
              query: {},
              body:
                '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Detect unusually high number of authentication attempts (beta)","groups":["siem"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"high number of authentication attempts","function":"high_non_zero_count","partition_field_name":"host.name"}],"influencers":["host.name","user.name","source.ip"]},"analysis_limits":{"model_memory_limit":"256mb"},"data_description":{"time_field":"@timestamp","time_format":"epoch_ms"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"IP Address Details","url_value":"siem#/ml-network/ip/$source.ip$?query=!n,queryLocation:network.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]}}',
              statusCode: 400,
              response:
                '{"error":{"root_cause":[{"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"}],"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index","caused_by":{"type":"illegal_argument_exception","reason":"mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"}},"status":400}',
            },
          },
          {
            id: 'siem-api-rare_process_linux_ecs',
            success: false,
            error: {
              msg:
                '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
              path: '/_ml/anomaly_detectors/siem-api-rare_process_linux_ecs',
              query: {},
              body:
                '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Detect unusually rare processes on Linux (beta)","groups":["siem"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"rare process executions on Linux","function":"rare","by_field_name":"process.name","partition_field_name":"host.name"}],"influencers":["host.name","process.name","user.name"]},"analysis_limits":{"model_memory_limit":"256mb"},"data_description":{"time_field":"@timestamp","time_format":"epoch_ms"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"Host Details by process name","url_value":"siem#/ml-hosts/$host.name$?query=(query:\'process.name%20:%20%22$process.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Host Details by user name","url_value":"siem#/ml-hosts/$host.name$?query=(query:\'user.name%20:%20%22$user.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by process name","url_value":"siem#/ml-hosts?query=(query:\'process.name%20:%20%22$process.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by user name","url_value":"siem#/ml-hosts?query=(query:\'user.name%20:%20%22$user.name$%22\',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]}}',
              statusCode: 400,
              response:
                '{"error":{"root_cause":[{"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"}],"type":"status_exception","reason":"This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index","caused_by":{"type":"illegal_argument_exception","reason":"mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"}},"status":400}',
            },
          },
        ],
        datafeeds: [
          {
            id: 'datafeed-siem-api-rare_process_linux_ecs',
            success: false,
            started: true,
          },
          {
            id: 'datafeed-siem-api-suspicious_login_activity_ecs',
            success: false,
            started: true,
          },
        ],
        kibana: {},
      };
      try {
        throwIfErrorAttachedToSetup(json);
      } catch (error) {
        expect(error.messages).toEqual([
          '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "status_exception",\n        "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"\n      }\n    ],\n    "type": "status_exception",\n    "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index",\n    "caused_by": {\n      "type": "illegal_argument_exception",\n      "reason": "mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"\n    }\n  },\n  "status": 400\n}',
          'Status Code: 400',
          '[status_exception] This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index',
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "status_exception",\n        "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index"\n      }\n    ],\n    "type": "status_exception",\n    "reason": "This job would cause a mapping clash with existing field [multi_bucket_impact] - avoid the clash by assigning a dedicated results index",\n    "caused_by": {\n      "type": "illegal_argument_exception",\n      "reason": "mapper [multi_bucket_impact] of different type, current_type [keyword], merged_type [double]"\n    }\n  },\n  "status": 400\n}',
          'Status Code: 400',
        ]);
      }
    });

    test('It throws an error if only dataFeeds has errors', async () => {
      const json: SetupMlResponse = {
        jobs: [
          {
            id: 'siem-api-suspicious_login_activity_ecs',
            success: false,
          },
          {
            id: 'siem-api-rare_process_linux_ecs',
            success: false,
          },
        ],
        datafeeds: [
          {
            id: 'datafeed-siem-api-rare_process_linux_ecs',
            success: false,
            started: false,
            error: {
              msg:
                "[resource_not_found_exception] No known job with id 'siem-api-rare_process_linux_ecs'",
              path: '/_ml/datafeeds/datafeed-siem-api-rare_process_linux_ecs',
              query: {},
              body:
                '{"job_id":"siem-api-rare_process_linux_ecs","indexes":["auditbeat-*"],"query":{"bool":{"filter":[{"terms":{"event.action":["process_started","executed"]}}]}}}',
              statusCode: 404,
              response:
                '{"error":{"root_cause":[{"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-rare_process_linux_ecs\'"}],"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-rare_process_linux_ecs\'"},"status":404}',
            },
          },
          {
            id: 'datafeed-siem-api-suspicious_login_activity_ecs',
            success: false,
            started: false,
            error: {
              msg:
                "[resource_not_found_exception] No known job with id 'siem-api-suspicious_login_activity_ecs'",
              path: '/_ml/datafeeds/datafeed-siem-api-suspicious_login_activity_ecs',
              query: {},
              body:
                '{"job_id":"siem-api-suspicious_login_activity_ecs","indexes":["auditbeat-*"],"query":{"bool":{"filter":{"term":{"event.category":"authentication"}}}}}',
              statusCode: 404,
              response:
                '{"error":{"root_cause":[{"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-suspicious_login_activity_ecs\'"}],"type":"resource_not_found_exception","reason":"No known job with id \'siem-api-suspicious_login_activity_ecs\'"},"status":404}',
            },
          },
        ],
        kibana: {},
      };
      try {
        throwIfErrorAttachedToSetup(json);
      } catch (error) {
        expect(error.messages).toEqual([
          "[resource_not_found_exception] No known job with id 'siem-api-rare_process_linux_ecs'",
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "resource_not_found_exception",\n        "reason": "No known job with id \'siem-api-rare_process_linux_ecs\'"\n      }\n    ],\n    "type": "resource_not_found_exception",\n    "reason": "No known job with id \'siem-api-rare_process_linux_ecs\'"\n  },\n  "status": 404\n}',
          'Status Code: 404',
          "[resource_not_found_exception] No known job with id 'siem-api-suspicious_login_activity_ecs'",
          '{\n  "error": {\n    "root_cause": [\n      {\n        "type": "resource_not_found_exception",\n        "reason": "No known job with id \'siem-api-suspicious_login_activity_ecs\'"\n      }\n    ],\n    "type": "resource_not_found_exception",\n    "reason": "No known job with id \'siem-api-suspicious_login_activity_ecs\'"\n  },\n  "status": 404\n}',
          'Status Code: 404',
        ]);
      }
    });

    test('It does not throw an error if it has no errors', async () => {
      const json: SetupMlResponse = {
        jobs: [
          {
            id: 'siem-api-suspicious_login_activity_ecs',
            success: false,
          },
          {
            id: 'siem-api-rare_process_linux_ecs',
            success: false,
          },
        ],
        datafeeds: [
          {
            id: 'datafeed-siem-api-rare_process_linux_ecs',
            success: false,
            started: false,
          },
          {
            id: 'datafeed-siem-api-suspicious_login_activity_ecs',
            success: false,
            started: false,
          },
        ],
        kibana: {},
      };
      expect(() => throwIfErrorAttachedToSetup(json)).not.toThrow();
    });
  });
});
