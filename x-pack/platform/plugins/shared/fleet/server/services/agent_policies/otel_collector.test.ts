/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output, FullAgentPolicyInput, TemplateAgentPolicyInput } from '../../types';

import { OTEL_COLLECTOR_INPUT_TYPE } from '../../../common/constants';

import { generateOtelcolConfig } from './otel_collector';

describe('generateOtelcolConfig', () => {
  const defaultOutput: Output = {
    type: 'elasticsearch',
    is_default: true,
    is_default_monitoring: true,
    name: 'default',
    id: 'fleet-default-output',
    hosts: ['http://localhost:9200'],
  };

  const logInput: FullAgentPolicyInput = {
    type: 'log',
    id: 'test',
    name: 'test',
    revision: 0,
    data_stream: {
      namespace: 'default',
    },
    use_output: 'default',
    package_policy_id: '123',
  };

  const otelInput1: FullAgentPolicyInput = {
    type: OTEL_COLLECTOR_INPUT_TYPE,
    id: 'test-1',
    name: 'test-1',
    revision: 0,
    data_stream: {
      namespace: 'testing',
    },
    use_output: 'default',
    package_policy_id: 'somepolicy',
    streams: [
      {
        id: 'stream-id-1',
        data_stream: {
          dataset: 'somedataset',
          type: 'metrics',
        },
        receivers: {
          httpcheck: {
            targets: [
              {
                endpoints: ['https://epr.elastic.co'],
              },
            ],
          },
        },
        processors: {
          transform: {
            metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
          },
        },
        service: {
          pipelines: {
            metrics: {
              receivers: ['httpcheck'],
              processors: ['transform'],
            },
          },
        },
      },
    ],
  };

  const otelInput2: FullAgentPolicyInput = {
    type: OTEL_COLLECTOR_INPUT_TYPE,
    id: 'test-2',
    name: 'test-2',
    revision: 0,
    data_stream: {
      namespace: 'default',
    },
    use_output: 'default',
    package_policy_id: 'otherpolicy',
    streams: [
      {
        id: 'stream-id-1',
        data_stream: {
          dataset: 'otherdataset',
          type: 'metrics',
        },
        receivers: {
          httpcheck: {
            targets: [
              {
                endpoints: ['https://www.elastic.co'],
              },
            ],
          },
        },
        processors: {
          transform: {
            metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
          },
        },
        service: {
          pipelines: {
            metrics: {
              receivers: ['httpcheck'],
              processors: ['transform'],
            },
          },
        },
      },
    ],
  };

  const otelInputTemplate: TemplateAgentPolicyInput = {
    type: OTEL_COLLECTOR_INPUT_TYPE,
    id: 'test-1',
    streams: [
      {
        id: 'stream-id-1',
        data_stream: {
          dataset: 'somedataset',
          type: 'metrics',
        },
        receivers: {
          httpcheck: {
            targets: [
              {
                endpoints: ['https://epr.elastic.co'],
              },
            ],
          },
        },
        processors: {
          transform: {
            metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
          },
        },
        service: {
          pipelines: {
            metrics: {
              receivers: ['httpcheck'],
              processors: ['transform'],
            },
          },
        },
      },
    ],
  };

  const otelInputMultipleComponentsSameType: FullAgentPolicyInput = {
    type: OTEL_COLLECTOR_INPUT_TYPE,
    id: 'test-3',
    name: 'test-3',
    revision: 0,
    data_stream: {
      namespace: 'default',
    },
    use_output: 'default',
    package_policy_id: 'otherpolicy',
    streams: [
      {
        id: 'stream-id-1',
        data_stream: {
          dataset: 'somedataset',
          type: 'metrics',
        },
        receivers: {
          'httpcheck/1': {
            targets: [
              {
                endpoints: ['https://epr.elastic.co'],
              },
            ],
          },
          'httpcheck/2': {
            targets: [
              {
                endpoints: ['https://epr.elastic.co'],
              },
            ],
          },
        },
        processors: {
          'transform/1': {
            metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
          },
          'transform/2': {
            metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
          },
        },
        service: {
          pipelines: {
            metrics: {
              receivers: ['httpcheck/1', 'httpcheck/2'],
              processors: ['transform/1', 'transform/2'],
            },
          },
        },
      },
    ],
  };

  const otelTracesInputWithAPM: FullAgentPolicyInput = {
    type: OTEL_COLLECTOR_INPUT_TYPE,
    id: 'test-traces',
    name: 'test-traces',
    revision: 0,
    data_stream: {
      namespace: 'default',
    },
    use_output: 'default',
    package_policy_id: 'tracespolicy',
    streams: [
      {
        id: 'stream-id-1',
        data_stream: {
          dataset: 'zipkinreceiver',
          type: 'traces',
        },
        use_apm: true,
        receivers: {
          zipkin: {
            endpoint: 'localhost:9411',
          },
        },
        service: {
          pipelines: {
            traces: {
              receivers: ['zipkin'],
            },
          },
        },
      },
    ],
  };

  it('should be empty if there is no input', () => {
    const inputs: FullAgentPolicyInput[] = [];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({});
  });

  it('should be empty if there is no otel config', () => {
    const inputs: FullAgentPolicyInput[] = [logInput];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({});
  });

  it('should return the otel config when there is one', () => {
    const inputs: FullAgentPolicyInput[] = [otelInput1];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({
      receivers: {
        'httpcheck/test-1-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/test-1-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-1-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "testing")',
              ],
            },
          ],
        },
      },
      connectors: {
        forward: {},
      },
      exporters: {
        'elasticsearch/default': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'metrics/test-1-stream-id-1': {
            receivers: ['httpcheck/test-1-stream-id-1'],
            processors: ['transform/test-1-stream-id-1', 'transform/test-1-stream-id-1-routing'],
            exporters: ['forward'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    });
  });

  it('should use the output id when it is not the default', () => {
    const inputs: FullAgentPolicyInput[] = [otelInput1];
    expect(generateOtelcolConfig(inputs, { ...defaultOutput, is_default: false })).toEqual({
      receivers: {
        'httpcheck/test-1-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/test-1-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-1-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "testing")',
              ],
            },
          ],
        },
      },
      connectors: {
        forward: {},
      },
      exporters: {
        'elasticsearch/fleet-default-output': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'metrics/test-1-stream-id-1': {
            receivers: ['httpcheck/test-1-stream-id-1'],
            processors: ['transform/test-1-stream-id-1', 'transform/test-1-stream-id-1-routing'],
            exporters: ['forward'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/fleet-default-output'],
          },
        },
      },
    });
  });

  it('should return the otel config if there is any', () => {
    const inputs: FullAgentPolicyInput[] = [logInput, otelInput1];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({
      receivers: {
        'httpcheck/test-1-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/test-1-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-1-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "testing")',
              ],
            },
          ],
        },
      },
      connectors: {
        forward: {},
      },
      exporters: {
        'elasticsearch/default': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'metrics/test-1-stream-id-1': {
            receivers: ['httpcheck/test-1-stream-id-1'],
            processors: ['transform/test-1-stream-id-1', 'transform/test-1-stream-id-1-routing'],
            exporters: ['forward'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    });
  });

  it('should also work for templates', () => {
    const inputs: TemplateAgentPolicyInput[] = [otelInputTemplate];
    expect(generateOtelcolConfig(inputs)).toEqual({
      receivers: {
        'httpcheck/test-1-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/test-1-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-1-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "default")',
              ],
            },
          ],
        },
      },
      service: {
        pipelines: {
          'metrics/test-1-stream-id-1': {
            receivers: ['httpcheck/test-1-stream-id-1'],
            processors: ['transform/test-1-stream-id-1', 'transform/test-1-stream-id-1-routing'],
          },
        },
      },
    });
  });

  it('should merge otel configs', () => {
    const inputs: FullAgentPolicyInput[] = [logInput, otelInput1, otelInput2];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({
      receivers: {
        'httpcheck/test-1-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
        'httpcheck/test-2-stream-id-1': {
          targets: [
            {
              endpoints: ['https://www.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/test-1-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-2-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-1-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "testing")',
              ],
            },
          ],
        },
        'transform/test-2-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "otherdataset")',
                'set(attributes["data_stream.namespace"], "default")',
              ],
            },
          ],
        },
      },
      connectors: {
        forward: {},
      },
      exporters: {
        'elasticsearch/default': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'metrics/test-1-stream-id-1': {
            receivers: ['httpcheck/test-1-stream-id-1'],
            processors: ['transform/test-1-stream-id-1', 'transform/test-1-stream-id-1-routing'],
            exporters: ['forward'],
          },
          'metrics/test-2-stream-id-1': {
            receivers: ['httpcheck/test-2-stream-id-1'],
            processors: ['transform/test-2-stream-id-1', 'transform/test-2-stream-id-1-routing'],
            exporters: ['forward'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    });
  });

  it('should keep components with the same type', () => {
    const inputs: FullAgentPolicyInput[] = [otelInputMultipleComponentsSameType];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({
      receivers: {
        'httpcheck/1/test-3-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
        'httpcheck/2/test-3-stream-id-1': {
          targets: [
            {
              endpoints: ['https://epr.elastic.co'],
            },
          ],
        },
      },
      processors: {
        'transform/1/test-3-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/2/test-3-stream-id-1': {
          metric_statements: ['set(metric.description, "Sum") where metric.type == "Sum"'],
        },
        'transform/test-3-stream-id-1-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: [
                'set(attributes["data_stream.type"], "metrics")',
                'set(attributes["data_stream.dataset"], "somedataset")',
                'set(attributes["data_stream.namespace"], "default")',
              ],
            },
          ],
        },
      },
      connectors: {
        forward: {},
      },
      exporters: {
        'elasticsearch/default': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'metrics/test-3-stream-id-1': {
            receivers: ['httpcheck/1/test-3-stream-id-1', 'httpcheck/2/test-3-stream-id-1'],
            processors: [
              'transform/1/test-3-stream-id-1',
              'transform/2/test-3-stream-id-1',
              'transform/test-3-stream-id-1-routing',
            ],
            exporters: ['forward'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    });
  });

  it('should add elasticapm connector and processor for traces input with use_apm enabled', () => {
    const inputs: FullAgentPolicyInput[] = [otelTracesInputWithAPM];
    expect(generateOtelcolConfig(inputs, defaultOutput)).toEqual({
      receivers: {
        'zipkin/test-traces-stream-id-1': {
          endpoint: 'localhost:9411',
        },
      },
      processors: {
        'transform/test-traces-stream-id-1-routing': {
          trace_statements: [
            {
              context: 'span',
              statements: [
                'set(attributes["data_stream.type"], "traces")',
                'set(attributes["data_stream.dataset"], "zipkinreceiver")',
                'set(attributes["data_stream.namespace"], "default")',
              ],
            },
            {
              context: 'spanevent',
              statements: [
                'set(attributes["data_stream.type"], "logs")',
                'set(attributes["data_stream.namespace"], "default")',
              ],
            },
          ],
        },
        elasticapm: {},
      },
      connectors: {
        elasticapm: {},
        forward: {},
      },
      exporters: {
        'elasticsearch/default': {
          endpoints: ['http://localhost:9200'],
        },
      },
      service: {
        pipelines: {
          'traces/test-traces-stream-id-1': {
            receivers: ['zipkin/test-traces-stream-id-1'],
            exporters: ['elasticapm', 'forward'],
            processors: ['elasticapm', 'transform/test-traces-stream-id-1-routing'],
          },
          'metrics/aggregated-otel-metrics': {
            receivers: ['elasticapm'],
            exporters: ['forward'],
          },
          traces: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    });
  });

  describe('with dynamic_signal_types (multiple signal types)', () => {
    const otelInputWithMultipleSignalTypes: FullAgentPolicyInput = {
      type: OTEL_COLLECTOR_INPUT_TYPE,
      id: 'test-multi-signal',
      name: 'test-multi-signal',
      revision: 0,
      data_stream: {
        namespace: 'default',
      },
      use_output: 'default',
      package_policy_id: 'multipolicy',
      meta: {
        package: {
          name: 'otel-multi-signal',
          version: '1.0.0',
        },
      },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: {
            dataset: 'multidataset',
            type: 'logs',
          },
          receivers: {
            otlp: {
              protocols: {
                grpc: {
                  endpoint: '0.0.0.0:4317',
                },
              },
            },
          },
          service: {
            pipelines: {
              'logs/otlp': {
                receivers: ['otlp'],
              },
              'metrics/otlp': {
                receivers: ['otlp'],
              },
              'traces/otlp': {
                receivers: ['otlp'],
              },
            },
          },
        },
      ],
    };

    const otelInputWithMultipleSignalTypes2: FullAgentPolicyInput = {
      type: OTEL_COLLECTOR_INPUT_TYPE,
      id: 'test-multi-signal',
      name: 'test-multi-signal',
      revision: 0,
      data_stream: {
        namespace: 'default',
      },
      use_output: 'default',
      package_policy_id: 'multipolicy',
      meta: {
        package: {
          name: 'otel-multi-signal',
          version: '1.0.0',
        },
      },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: {
            dataset: 'multidataset',
            type: 'logs',
          },
          receivers: {
            otlp: {
              protocols: {
                grpc: {
                  endpoint: '0.0.0.0:4317',
                },
              },
            },
          },
          service: {
            pipelines: {
              logs: {
                receivers: ['otlp'],
              },
              metrics: {
                receivers: ['otlp'],
              },
              traces: {
                receivers: ['otlp'],
              },
            },
          },
        },
      ],
    };

    const packageInfoCache = new Map([
      [
        'otel-multi-signal-1.0.0',
        {
          name: 'otel-multi-signal',
          version: '1.0.0',
          policy_templates: [
            {
              name: 'template1',
              title: 'OTel Multi Signal',
              input: 'otelcol',
              type: 'logs',
              template_path: 'input.yml.hbs',
              dynamic_signal_types: true,
              vars: [],
            },
          ],
        } as any,
      ],
    ]);

    it('should generate transform with multiple signal type statements when dynamic_signal_types is true', () => {
      const inputs: FullAgentPolicyInput[] = [otelInputWithMultipleSignalTypes];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        trace_statements: [
          {
            context: 'span',
            statements: [
              'set(attributes["data_stream.type"], "traces")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
          {
            context: 'spanevent',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
    });

    it('should generate transform with multiple signal type statements when dynamic_signal_types is true and pipelines have simple names', () => {
      const inputs: FullAgentPolicyInput[] = [otelInputWithMultipleSignalTypes2];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        trace_statements: [
          {
            context: 'span',
            statements: [
              'set(attributes["data_stream.type"], "traces")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
          {
            context: 'spanevent',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
    });

    it('should generate transform with only specified signal types when pipelines have subset', () => {
      const baseStream = otelInputWithMultipleSignalTypes.streams?.[0];
      if (!baseStream) {
        throw new Error('Test data is invalid');
      }

      const otelInputWithSubsetSignalTypes: FullAgentPolicyInput = {
        ...otelInputWithMultipleSignalTypes,
        streams: [
          {
            ...baseStream,
            service: {
              pipelines: {
                'logs/otlp': {
                  receivers: ['otlp'],
                },
                'metrics/otlp': {
                  receivers: ['otlp'],
                },
              },
            },
          },
        ],
      };

      const inputs: FullAgentPolicyInput[] = [otelInputWithSubsetSignalTypes];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
      // Should not have trace_statements
      expect(
        result.processors?.['transform/test-multi-signal-stream-id-1-routing']?.trace_statements
      ).toBeUndefined();
    });

    it('should fall back to single signal type when dynamic_signal_types is false', () => {
      const packageInfoCacheNoDynamic = new Map([
        [
          'otel-multi-signal-1.0.0',
          {
            name: 'otel-multi-signal',
            version: '1.0.0',
            policy_templates: [
              {
                name: 'template1',
                title: 'OTel Multi Signal',
                input: 'otelcol',
                type: 'logs',
                template_path: 'input.yml.hbs',
                dynamic_signal_types: false,
                vars: [],
              },
            ],
          } as any,
        ],
      ]);

      const inputs: FullAgentPolicyInput[] = [otelInputWithMultipleSignalTypes];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCacheNoDynamic);

      // Should generate single signal type transform (uses stream.data_stream.type)
      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
    });

    it('should use stream data_stream.type when dynamic_signal_types is not defined', () => {
      const otelInputWithMetricsType: FullAgentPolicyInput = {
        ...otelInputWithMultipleSignalTypes,
        streams: [
          {
            id: 'stream-id-1',
            data_stream: {
              dataset: 'multidataset',
              type: 'metrics',
            },
            receivers: {
              otlp: {
                protocols: {
                  grpc: {
                    endpoint: '0.0.0.0:4317',
                  },
                },
              },
            },
          },
        ],
      };

      const packageInfoCacheNoDynamicVar = new Map([
        [
          'otel-multi-signal-1.0.0',
          {
            name: 'otel-multi-signal',
            version: '1.0.0',
            policy_templates: [
              {
                name: 'template1',
                title: 'OTel Multi Signal',
                input: 'otelcol',
                type: 'logs',
                // No dynamic_signal_types property
                template_path: 'input.yml.hbs',
                vars: [],
              },
            ],
          } as any,
        ],
      ]);

      const inputs: FullAgentPolicyInput[] = [otelInputWithMetricsType];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCacheNoDynamicVar);

      // Should use the stream's data_stream.type (metrics)
      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.dataset"], "multidataset")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
    });
  });
});
