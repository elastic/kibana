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
      namespace: 'apmtest',
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
                'set(attributes["data_stream.namespace"], "apmtest")',
              ],
            },
            {
              context: 'spanevent',
              statements: [
                'set(attributes["data_stream.type"], "logs")',
                'set(attributes["data_stream.namespace"], "apmtest")',
              ],
            },
          ],
        },
        'transform/apmtest-apm-namespace-routing': {
          metric_statements: [
            {
              context: 'datapoint',
              statements: ['set(attributes["data_stream.namespace"], "apmtest")'],
            },
          ],
        },
        'elasticapm/apmtest': {},
      },
      connectors: {
        'elasticapm/apmtest': {},
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
            exporters: ['elasticapm/apmtest', 'forward'],
            processors: ['elasticapm/apmtest', 'transform/test-traces-stream-id-1-routing'],
          },
          'metrics/apmtest-aggregated-apm-metrics': {
            receivers: ['elasticapm/apmtest'],
            processors: ['transform/apmtest-apm-namespace-routing'],
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

  it('should produce separate aggregated-apm-metrics pipelines for two APM package policies with different namespaces', () => {
    const inputA: FullAgentPolicyInput = {
      ...otelTracesInputWithAPM,
      id: 'policy-a',
      name: 'policy-a',
      package_policy_id: 'policy-a',
      data_stream: { namespace: 'ns-a' },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: { dataset: 'apm', type: 'traces' },
          use_apm: true,
          receivers: { otlp: { protocols: { grpc: { endpoint: '0.0.0.0:4317' } } } },
          service: { pipelines: { traces: { receivers: ['otlp'] } } },
        },
      ],
    };
    const inputB: FullAgentPolicyInput = {
      ...otelTracesInputWithAPM,
      id: 'policy-b',
      name: 'policy-b',
      package_policy_id: 'policy-b',
      data_stream: { namespace: 'ns-b' },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: { dataset: 'apm', type: 'traces' },
          use_apm: true,
          receivers: { otlp: { protocols: { grpc: { endpoint: '0.0.0.0:4318' } } } },
          service: { pipelines: { traces: { receivers: ['otlp'] } } },
        },
      ],
    };

    const result = generateOtelcolConfig([inputA, inputB], defaultOutput);

    expect(result.connectors?.['elasticapm/ns-a']).toEqual({});
    expect(result.connectors?.['elasticapm/ns-b']).toEqual({});
    expect(result.connectors?.['elasticapm/policy-a-stream-id-1']).toBeUndefined();
    expect(result.connectors?.['elasticapm/policy-b-stream-id-1']).toBeUndefined();

    expect(result.service?.pipelines?.['metrics/ns-a-aggregated-apm-metrics']).toEqual({
      receivers: ['elasticapm/ns-a'],
      processors: ['transform/ns-a-apm-namespace-routing'],
      exporters: ['forward'],
    });
    expect(result.service?.pipelines?.['metrics/ns-b-aggregated-apm-metrics']).toEqual({
      receivers: ['elasticapm/ns-b'],
      processors: ['transform/ns-b-apm-namespace-routing'],
      exporters: ['forward'],
    });
    expect(
      result.service?.pipelines?.['metrics/policy-a-stream-id-1-aggregated-apm-metrics']
    ).toBeUndefined();
    expect(
      result.service?.pipelines?.['metrics/policy-b-stream-id-1-aggregated-apm-metrics']
    ).toBeUndefined();

    expect(result.processors?.['transform/ns-a-apm-namespace-routing']).toEqual({
      metric_statements: [
        { context: 'datapoint', statements: ['set(attributes["data_stream.namespace"], "ns-a")'] },
      ],
    });
    expect(result.processors?.['transform/ns-b-apm-namespace-routing']).toEqual({
      metric_statements: [
        { context: 'datapoint', statements: ['set(attributes["data_stream.namespace"], "ns-b")'] },
      ],
    });

    expect(result.service?.pipelines?.['traces/policy-a-stream-id-1']?.exporters).toContain(
      'elasticapm/ns-a'
    );
    expect(result.service?.pipelines?.['traces/policy-b-stream-id-1']?.exporters).toContain(
      'elasticapm/ns-b'
    );
  });

  it('should produce a single aggregated-apm-metrics pipeline for two APM package policies with the same namespace', () => {
    const inputA: FullAgentPolicyInput = {
      ...otelTracesInputWithAPM,
      id: 'policy-a',
      name: 'policy-a',
      package_policy_id: 'policy-a',
      data_stream: { namespace: 'ns-shared' },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: { dataset: 'apm', type: 'traces' },
          use_apm: true,
          receivers: { otlp: { protocols: { grpc: { endpoint: '0.0.0.0:4317' } } } },
          service: { pipelines: { traces: { receivers: ['otlp'] } } },
        },
      ],
    };
    const inputB: FullAgentPolicyInput = {
      ...otelTracesInputWithAPM,
      id: 'policy-b',
      name: 'policy-b',
      package_policy_id: 'policy-b',
      data_stream: { namespace: 'ns-shared' },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: { dataset: 'apm', type: 'traces' },
          use_apm: true,
          receivers: { otlp: { protocols: { grpc: { endpoint: '0.0.0.0:4318' } } } },
          service: { pipelines: { traces: { receivers: ['otlp'] } } },
        },
      ],
    };

    const result = generateOtelcolConfig([inputA, inputB], defaultOutput);

    expect(result.connectors?.['elasticapm/ns-shared']).toEqual({});
    expect(result.connectors?.['elasticapm/policy-a-stream-id-1']).toBeUndefined();
    expect(result.connectors?.['elasticapm/policy-b-stream-id-1']).toBeUndefined();

    const aggregatedPipelineKeys = Object.keys(result.service?.pipelines ?? {}).filter((k) =>
      k.includes('aggregated-apm-metrics')
    );
    expect(aggregatedPipelineKeys).toHaveLength(1);
    expect(result.service?.pipelines?.['metrics/ns-shared-aggregated-apm-metrics']).toEqual({
      receivers: ['elasticapm/ns-shared'],
      processors: ['transform/ns-shared-apm-namespace-routing'],
      exporters: ['forward'],
    });

    expect(result.service?.pipelines?.['traces/policy-a-stream-id-1']?.exporters).toContain(
      'elasticapm/ns-shared'
    );
    expect(result.service?.pipelines?.['traces/policy-b-stream-id-1']?.exporters).toContain(
      'elasticapm/ns-shared'
    );
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
              'profiles/otlp': {
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
              profiles: {
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

    it('should add elasticapm connector and processor when stream has traces pipeline and use_apm enabled even if data_stream.type is not traces', () => {
      const inputWithUseApm: FullAgentPolicyInput = {
        ...otelInputWithMultipleSignalTypes,
        streams:
          otelInputWithMultipleSignalTypes.streams?.map((stream) => ({
            ...stream,
            use_apm: true,
          })) ?? [],
      };
      const inputs: FullAgentPolicyInput[] = [inputWithUseApm];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      expect(result.connectors?.['elasticapm/default']).toEqual({});
      expect(result.processors?.['elasticapm/default']).toEqual({});
      expect(result.service?.pipelines?.['metrics/default-aggregated-apm-metrics']).toEqual({
        receivers: ['elasticapm/default'],
        processors: ['transform/default-apm-namespace-routing'],
        exporters: ['forward'],
      });
      const tracesPipelineKey = 'traces/otlp/test-multi-signal-stream-id-1';
      const tracesPipeline = result.service?.pipelines?.[tracesPipelineKey];
      expect(tracesPipeline).toBeDefined();
      expect(tracesPipeline?.exporters).toContain('elasticapm/default');
      expect(tracesPipeline?.processors).toContain('elasticapm/default');
      const metricsPipelineKey = 'metrics/otlp/test-multi-signal-stream-id-1';
      const metricsPipeline = result.service?.pipelines?.[metricsPipelineKey];
      expect(metricsPipeline).toBeDefined();
      expect(metricsPipeline?.exporters).not.toContain('elasticapm/default');
      expect(metricsPipeline?.processors).not.toContain('elasticapm/default');
    });

    it('should generate transform with multiple signal type statements when dynamic_signal_types is true', () => {
      const inputs: FullAgentPolicyInput[] = [otelInputWithMultipleSignalTypes];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      // dynamic_signal_types: data_stream.dataset is NOT set — deferred to ES exporter routing
      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        trace_statements: [
          {
            context: 'span',
            statements: [
              'set(attributes["data_stream.type"], "traces")',
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
        profile_statements: [
          {
            context: 'profile',
            statements: [
              'set(attributes["data_stream.type"], "profiles")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
      });
    });

    it('should generate transform with multiple signal type statements when dynamic_signal_types is true and pipelines have simple names', () => {
      const inputs: FullAgentPolicyInput[] = [otelInputWithMultipleSignalTypes2];
      const result = generateOtelcolConfig(inputs, defaultOutput, packageInfoCache);

      // dynamic_signal_types: data_stream.dataset is NOT set — deferred to ES exporter routing
      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        trace_statements: [
          {
            context: 'span',
            statements: [
              'set(attributes["data_stream.type"], "traces")',
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
        profile_statements: [
          {
            context: 'profile',
            statements: [
              'set(attributes["data_stream.type"], "profiles")',
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

      // dynamic_signal_types: data_stream.dataset is NOT set — deferred to ES exporter routing
      expect(result.processors?.['transform/test-multi-signal-stream-id-1-routing']).toEqual({
        log_statements: [
          {
            context: 'log',
            statements: [
              'set(attributes["data_stream.type"], "logs")',
              'set(attributes["data_stream.namespace"], "default")',
            ],
          },
        ],
        metric_statements: [
          {
            context: 'datapoint',
            statements: [
              'set(attributes["data_stream.type"], "metrics")',
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

  describe('integration-type packages with otelcol input', () => {
    const otelIntegrationInput: FullAgentPolicyInput = {
      type: OTEL_COLLECTOR_INPUT_TYPE,
      id: 'integration-otel',
      name: 'integration-otel',
      revision: 0,
      data_stream: { namespace: 'default' },
      use_output: 'default',
      package_policy_id: 'integration-policy',
      meta: {
        package: { name: 'my_integration', version: '1.0.0' },
      },
      streams: [
        {
          id: 'stream-id-1',
          data_stream: { dataset: 'my_integration.metrics', type: 'metrics' },
          service: {
            pipelines: {
              'metrics/otlp': {
                receivers: ['otlp/integration-otel-stream-id-1'],
                processors: [],
              },
            },
          },
          receivers: { otlp: {} },
        },
      ],
    };

    it('generates OTel config for integration package with otelcol input', () => {
      const result = generateOtelcolConfig([otelIntegrationInput], defaultOutput);

      expect(result.receivers).toHaveProperty('otlp/integration-otel-stream-id-1');
      expect(result.exporters).toHaveProperty('elasticsearch/default');
      expect(result.service?.pipelines).toHaveProperty('metrics');
    });

    it('uses defaultPackageInfo for dynamic signal types when packageInfoCache has no meta match', () => {
      // TemplateAgentPolicyInput has no meta.package — simulate via defaultPackageInfo
      const templateInput: TemplateAgentPolicyInput = {
        id: 'integration-otel',
        type: OTEL_COLLECTOR_INPUT_TYPE,
        streams: [
          {
            id: 'stream-id-1',
            data_stream: { dataset: 'my_integration.data', type: 'metrics' },
            service: {
              pipelines: {
                'metrics/otlp': {
                  receivers: ['otlp/integration-otel-stream-id-1'],
                  processors: [],
                },
                'logs/otlp': { receivers: ['otlp/integration-otel-stream-id-1'], processors: [] },
              },
            },
            receivers: { otlp: {} },
          },
        ],
      };

      const integrationPackageInfo = {
        type: 'integration',
        name: 'my_integration',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'my_policy',
            title: 'My Policy',
            description: 'My Policy',
            inputs: [
              {
                type: OTEL_COLLECTOR_INPUT_TYPE,
                title: 'OTel',
                description: 'OTel',
                dynamic_signal_types: true,
              },
            ],
          },
        ],
      } as any;

      const result = generateOtelcolConfig(
        [templateInput],
        undefined,
        undefined,
        integrationPackageInfo
      );

      // With dynamic_signal_types, routing transforms are generated per signal type
      const routingKey = Object.keys(result.processors ?? {}).find((k) =>
        k.startsWith('transform/')
      );
      expect(routingKey).toBeDefined();
      const routingProcessor = result.processors?.[routingKey!];
      // Should have both metric_statements and log_statements for dynamic signal types
      expect(routingProcessor).toHaveProperty('metric_statements');
      expect(routingProcessor).toHaveProperty('log_statements');
    });

    it('falls back to single signal type routing when integration package has no dynamic_signal_types', () => {
      const templateInput: TemplateAgentPolicyInput = {
        id: 'integration-otel',
        type: OTEL_COLLECTOR_INPUT_TYPE,
        streams: [
          {
            id: 'stream-id-1',
            data_stream: { dataset: 'my_integration.metrics', type: 'metrics' },
            service: {
              pipelines: {
                'metrics/otlp': {
                  receivers: ['otlp/integration-otel-stream-id-1'],
                  processors: [],
                },
              },
            },
            receivers: { otlp: {} },
          },
        ],
      };

      const integrationPackageInfo = {
        type: 'integration',
        name: 'my_integration',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'my_policy',
            title: 'My Policy',
            description: 'My Policy',
            inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, title: 'OTel', description: 'OTel' }],
          },
        ],
      } as any;

      const result = generateOtelcolConfig(
        [templateInput],
        undefined,
        undefined,
        integrationPackageInfo
      );

      const routingKey = Object.keys(result.processors ?? {}).find((k) =>
        k.startsWith('transform/')
      );
      expect(routingKey).toBeDefined();
      const routingProcessor = result.processors?.[routingKey!];
      // Without dynamic_signal_types, only metric_statements (from data_stream.type: metrics)
      expect(routingProcessor).toHaveProperty('metric_statements');
      expect(routingProcessor).not.toHaveProperty('log_statements');
    });

    it('defaultPackageInfo is overridden by packageInfoCache when meta.package is present', () => {
      // When both are provided, cache takes precedence for inputs that have meta.package
      const packageInfoCacheWithDynamic = new Map([
        [
          'my_integration-1.0.0',
          {
            type: 'integration',
            name: 'my_integration',
            version: '1.0.0',
            policy_templates: [
              {
                name: 'my_policy',
                title: 'My Policy',
                description: 'My Policy',
                inputs: [
                  {
                    type: OTEL_COLLECTOR_INPUT_TYPE,
                    title: 'OTel',
                    description: 'OTel',
                    dynamic_signal_types: true,
                  },
                ],
              },
            ],
          } as any,
        ],
      ]);

      // defaultPackageInfo says no dynamic_signal_types
      const defaultPkgInfoNoDynamic = {
        type: 'integration',
        name: 'my_integration',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'my_policy',
            title: 'My Policy',
            description: 'My Policy',
            inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, title: 'OTel', description: 'OTel' }],
          },
        ],
      } as any;

      const inputWithMeta: FullAgentPolicyInput = {
        ...otelIntegrationInput,
        streams: [
          {
            id: 'stream-id-1',
            data_stream: { dataset: 'my_integration.data', type: 'metrics' },
            service: {
              pipelines: {
                'metrics/otlp': {
                  receivers: ['otlp/integration-otel-stream-id-1'],
                  processors: [],
                },
                'logs/otlp': { receivers: ['otlp/integration-otel-stream-id-1'], processors: [] },
              },
            },
            receivers: { otlp: {} },
          },
        ],
      };

      const result = generateOtelcolConfig(
        [inputWithMeta],
        undefined,
        packageInfoCacheWithDynamic,
        defaultPkgInfoNoDynamic
      );

      const routingKey = Object.keys(result.processors ?? {}).find((k) =>
        k.startsWith('transform/')
      );
      const routingProcessor = result.processors?.[routingKey!];
      // Cache has dynamic_signal_types: true, so routing should have both metric and log statements
      expect(routingProcessor).toHaveProperty('metric_statements');
      expect(routingProcessor).toHaveProperty('log_statements');
    });

    it('uses single-type routing for a non-dynamic input even when another template in the same package has dynamic_signal_types', () => {
      // Package has two policy templates: 'otel_policy' with dynamic_signal_types and
      // 'metrics_policy' without it. The input below belongs to 'metrics_policy'.
      const mixedPackageInfo = {
        type: 'integration',
        name: 'mixed_pkg',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'otel_policy',
            title: 'OTel',
            description: 'OTel',
            inputs: [
              {
                type: OTEL_COLLECTOR_INPUT_TYPE,
                title: 'OTel',
                description: 'OTel',
                dynamic_signal_types: true,
              },
            ],
          },
          {
            name: 'metrics_policy',
            title: 'Metrics',
            description: 'Metrics',
            inputs: [
              {
                type: OTEL_COLLECTOR_INPUT_TYPE,
                title: 'Metrics OTel',
                description: 'Metrics only',
                // No dynamic_signal_types
              },
            ],
          },
        ],
      } as any;

      const nonDynamicInput: FullAgentPolicyInput = {
        type: OTEL_COLLECTOR_INPUT_TYPE,
        id: 'non-dynamic-otel',
        name: 'non-dynamic-otel',
        revision: 0,
        data_stream: { namespace: 'default' },
        use_output: 'default',
        package_policy_id: 'non-dynamic-policy',
        meta: {
          package: {
            name: 'mixed_pkg',
            version: '1.0.0',
            policy_template: 'metrics_policy', // belongs to the non-dynamic template
          },
        },
        streams: [
          {
            id: 'stream-id-1',
            data_stream: { dataset: 'mixed_pkg.metrics', type: 'metrics' },
            service: {
              pipelines: {
                'metrics/otlp': { receivers: ['otlp'] },
                'logs/otlp': { receivers: ['otlp'] },
              },
            },
          },
        ],
      };

      const cache = new Map([['mixed_pkg-1.0.0', mixedPackageInfo]]);
      const result = generateOtelcolConfig([nonDynamicInput], undefined, cache);

      const routingKey = Object.keys(result.processors ?? {}).find((k) =>
        k.startsWith('transform/')
      );
      expect(routingKey).toBeDefined();
      const routingProcessor = result.processors?.[routingKey!];

      // 'metrics_policy' input has no dynamic_signal_types — must produce only metric_statements
      // (from data_stream.type: metrics), not log_statements from the other template.
      expect(routingProcessor).toHaveProperty('metric_statements');
      expect(routingProcessor).not.toHaveProperty('log_statements');
    });

    it('uses single-type routing for an otelcol input when the same template also has a different dynamic input type', () => {
      // Single template 'combined_policy' with two inputs:
      //   - 'otelcol'         — no dynamic_signal_types
      //   - 'custom_receiver' — dynamic_signal_types: true
      // Only the 'otelcol' input is processed here; it should produce single-type routing
      // because its own definition has no dynamic_signal_types.
      const mixedInputsPackageInfo = {
        type: 'integration',
        name: 'combined_pkg',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'combined_policy',
            title: 'Combined',
            description: 'Combined inputs',
            inputs: [
              {
                type: OTEL_COLLECTOR_INPUT_TYPE,
                title: 'OTel',
                description: 'Standard OTel collector',
                // No dynamic_signal_types
              },
              {
                type: 'custom_receiver',
                title: 'Custom',
                description: 'Custom dynamic receiver',
                dynamic_signal_types: true,
              },
            ],
          },
        ],
      } as any;

      const nonDynamicOtelInput: FullAgentPolicyInput = {
        type: OTEL_COLLECTOR_INPUT_TYPE,
        id: 'combined-otel',
        name: 'combined-otel',
        revision: 0,
        data_stream: { namespace: 'default' },
        use_output: 'default',
        package_policy_id: 'combined-policy',
        meta: {
          package: {
            name: 'combined_pkg',
            version: '1.0.0',
            policy_template: 'combined_policy',
          },
        },
        streams: [
          {
            id: 'stream-id-1',
            data_stream: { dataset: 'combined_pkg.metrics', type: 'metrics' },
            service: {
              pipelines: {
                'metrics/otlp': { receivers: ['otlp'] },
                'logs/otlp': { receivers: ['otlp'] },
              },
            },
          },
        ],
      };

      const cache = new Map([['combined_pkg-1.0.0', mixedInputsPackageInfo]]);
      const result = generateOtelcolConfig([nonDynamicOtelInput], undefined, cache);

      const routingKey = Object.keys(result.processors ?? {}).find((k) =>
        k.startsWith('transform/')
      );
      expect(routingKey).toBeDefined();
      const routingProcessor = result.processors?.[routingKey!];

      // otelcol in this template has no dynamic_signal_types — must produce only metric_statements
      // (from data_stream.type: metrics), not log_statements from the sibling custom_receiver input.
      expect(routingProcessor).toHaveProperty('metric_statements');
      expect(routingProcessor).not.toHaveProperty('log_statements');
    });
  });
});
