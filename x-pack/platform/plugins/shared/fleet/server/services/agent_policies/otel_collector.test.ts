/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output, FullAgentPolicyInput, TemplateAgentPolicyInput } from '../../types';
import { generateOtelcolConfig } from './otel_collector';
import { OTEL_COLLECTOR_INPUT_TYPE } from '../../../common/constants';

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
});
