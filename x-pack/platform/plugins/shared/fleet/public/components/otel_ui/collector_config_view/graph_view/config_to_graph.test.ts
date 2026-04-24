/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OTelCollectorConfig } from '../../../../../common/types';

import { ALL_PIPELINES, SIGNAL_PREFIX } from '../utils';

import { configToGraph } from './config_to_graph';

describe('configToGraph', () => {
  it('returns empty nodes and edges for empty config', () => {
    const result = configToGraph({});
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.isMergedView).toBe(true);
  });

  it('returns empty nodes and edges when there are no pipelines', () => {
    const config: OTelCollectorConfig = {
      receivers: { otlp: {} },
      exporters: { 'elasticsearch/default': {} },
    };
    const result = configToGraph(config);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  describe('merged view (single pipeline)', () => {
    it('uses merged view for a single pipeline', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            metrics: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);
      expect(result.isMergedView).toBe(true);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toMatchObject({
        source: 'otlp',
        target: 'elasticsearch/default',
      });
    });

    it('chains receivers through processors to exporters', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        processors: { batch: {}, 'transform/routing': {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              processors: ['batch', 'transform/routing'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const edgePairs = result.edges.map((e) => [e.source, e.target]);
      expect(edgePairs).toContainEqual(['otlp', 'batch']);
      expect(edgePairs).toContainEqual(['batch', 'transform/routing']);
      expect(edgePairs).toContainEqual(['transform/routing', 'elasticsearch/default']);
      expect(result.edges).toHaveLength(3);
    });

    it('handles multiple receivers and exporters in a single pipeline', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {}, zipkin: {} },
        processors: { batch: {} },
        exporters: { 'elasticsearch/default': {}, 'debug/verbose': {} },
        service: {
          pipelines: {
            traces: {
              receivers: ['otlp', 'zipkin'],
              processors: ['batch'],
              exporters: ['elasticsearch/default', 'debug/verbose'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const edgePairs = result.edges.map((e) => [e.source, e.target]);
      expect(edgePairs).toContainEqual(['otlp', 'batch']);
      expect(edgePairs).toContainEqual(['zipkin', 'batch']);
      expect(edgePairs).toContainEqual(['batch', 'elasticsearch/default']);
      expect(edgePairs).toContainEqual(['batch', 'debug/verbose']);
      expect(result.edges).toHaveLength(4);
    });

    it('handles pipeline with empty arrays gracefully', () => {
      const config: OTelCollectorConfig = {
        service: {
          pipelines: {
            logs: {
              receivers: [],
              processors: [],
              exporters: [],
            },
          },
        },
      };
      const result = configToGraph(config);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('grouped view (multiple pipelines)', () => {
    it('uses grouped view when multiple pipelines are visible', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
            metrics: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);
      expect(result.isMergedView).toBe(false);
    });

    it('creates group nodes for each pipeline', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
            metrics: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const groupNodes = result.nodes.filter((n) => n.type === 'pipelineGroup');
      expect(groupNodes).toHaveLength(2);
      expect(groupNodes.map((n) => n.data.label).sort()).toEqual(['logs', 'metrics']);
    });

    it('scopes component node IDs per pipeline', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
            metrics: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const componentNodes = result.nodes.filter((n) => n.type === 'component');
      expect(componentNodes).toHaveLength(4);
      const ids = componentNodes.map((n) => n.id).sort();
      expect(ids).toEqual([
        'logs::elasticsearch/default',
        'logs::otlp',
        'metrics::elasticsearch/default',
        'metrics::otlp',
      ]);
    });

    it('assigns parentId to child nodes', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
            metrics: {
              receivers: ['otlp'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const logsChildren = result.nodes.filter(
        (n) => n.type === 'component' && n.parentId === 'pipeline::logs'
      );
      expect(logsChildren).toHaveLength(2);

      const metricsChildren = result.nodes.filter(
        (n) => n.type === 'component' && n.parentId === 'pipeline::metrics'
      );
      expect(metricsChildren).toHaveLength(2);
    });

    it('creates edges scoped to pipeline', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        processors: { batch: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              processors: ['batch'],
              exporters: ['elasticsearch/default'],
            },
            metrics: {
              receivers: ['otlp'],
              processors: ['batch'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const edgePairs = result.edges.map((e) => [e.source, e.target]);
      expect(edgePairs).toContainEqual(['logs::otlp', 'logs::batch']);
      expect(edgePairs).toContainEqual(['logs::batch', 'logs::elasticsearch/default']);
      expect(edgePairs).toContainEqual(['metrics::otlp', 'metrics::batch']);
      expect(edgePairs).toContainEqual(['metrics::batch', 'metrics::elasticsearch/default']);
      expect(result.edges).toHaveLength(4);
    });

    it('assigns correct component types in grouped view', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        processors: { batch: {} },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              processors: ['batch'],
              exporters: ['forward'],
            },
            'logs/aggregated': {
              receivers: ['forward'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const componentNodes = result.nodes.filter((n) => n.type === 'component');
      const typeMap = new Map(componentNodes.map((n) => [n.id, n.data.componentType]));
      expect(typeMap.get('logs::otlp')).toBe('receiver');
      expect(typeMap.get('logs::batch')).toBe('processor');
      expect(typeMap.get('logs::forward')).toBe('connector');
      expect(typeMap.get('logs/aggregated::forward')).toBe('connector');
      expect(typeMap.get('logs/aggregated::elasticsearch/default')).toBe('exporter');
    });

    it('handles a complex real-world config with grouped view', () => {
      const config: OTelCollectorConfig = {
        receivers: {
          'httpcheck/test-1-stream-1': { targets: [{ endpoint: 'https://elastic.co' }] },
          'httpcheck/test-1-stream-2': { targets: [{ endpoint: 'https://kibana.dev' }] },
        },
        processors: {
          'transform/test-1-stream-1': {},
          'transform/test-1-stream-1-routing': {},
          'transform/test-1-stream-2': {},
          'transform/test-1-stream-2-routing': {},
        },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            'metrics/test-1-stream-1': {
              receivers: ['httpcheck/test-1-stream-1'],
              processors: ['transform/test-1-stream-1', 'transform/test-1-stream-1-routing'],
              exporters: ['forward'],
            },
            'metrics/test-1-stream-2': {
              receivers: ['httpcheck/test-1-stream-2'],
              processors: ['transform/test-1-stream-2', 'transform/test-1-stream-2-routing'],
              exporters: ['forward'],
            },
            metrics: {
              receivers: ['forward'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      expect(result.isMergedView).toBe(false);
      const groupNodes = result.nodes.filter((n) => n.type === 'pipelineGroup');
      expect(groupNodes).toHaveLength(3);

      const componentNodes = result.nodes.filter((n) => n.type === 'component');
      expect(componentNodes).toHaveLength(10);
    });
  });

  describe('pipeline filtering', () => {
    const multiPipelineConfig: OTelCollectorConfig = {
      receivers: { otlp: {}, 'httpcheck/stream-1': {} },
      processors: { batch: {}, 'transform/routing': {} },
      connectors: { forward: {} },
      exporters: { 'elasticsearch/default': {} },
      service: {
        pipelines: {
          'metrics/stream-1': {
            receivers: ['httpcheck/stream-1'],
            processors: ['transform/routing'],
            exporters: ['forward'],
          },
          logs: {
            receivers: ['otlp'],
            processors: ['batch'],
            exporters: ['elasticsearch/default'],
          },
          metrics: {
            receivers: ['forward'],
            exporters: ['elasticsearch/default'],
          },
        },
      },
    };

    it('uses grouped view when ALL_PIPELINES is selected with multiple pipelines', () => {
      const result = configToGraph(multiPipelineConfig, ALL_PIPELINES);
      expect(result.isMergedView).toBe(false);
      const groupNodes = result.nodes.filter((n) => n.type === 'pipelineGroup');
      expect(groupNodes).toHaveLength(3);
    });

    it('uses grouped view by default when no filter is provided', () => {
      const result = configToGraph(multiPipelineConfig);
      expect(result.isMergedView).toBe(false);
    });

    it('uses merged view when filtering to a single pipeline', () => {
      const result = configToGraph(multiPipelineConfig, 'logs');
      expect(result.isMergedView).toBe(true);

      const nodeIds = result.nodes.map((n) => n.id).sort();
      expect(nodeIds).toEqual(['batch', 'elasticsearch/default', 'otlp']);
      expect(result.edges).toHaveLength(2);
    });

    it('uses merged view when filtering to a single namespaced pipeline', () => {
      const result = configToGraph(multiPipelineConfig, 'metrics/stream-1');
      expect(result.isMergedView).toBe(true);

      const nodeIds = result.nodes.map((n) => n.id).sort();
      expect(nodeIds).toEqual(['forward', 'httpcheck/stream-1', 'transform/routing']);
      expect(result.edges).toHaveLength(2);
    });

    it('returns empty graph for a non-existent pipeline', () => {
      const result = configToGraph(multiPipelineConfig, 'traces/nonexistent');
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('uses grouped view when signal type filter matches multiple pipelines', () => {
      const result = configToGraph(multiPipelineConfig, `${SIGNAL_PREFIX}metrics`);
      expect(result.isMergedView).toBe(false);

      const groupNodes = result.nodes.filter((n) => n.type === 'pipelineGroup');
      expect(groupNodes).toHaveLength(2);
    });

    it('returns empty graph for a signal type with no pipelines', () => {
      const result = configToGraph(multiPipelineConfig, `${SIGNAL_PREFIX}traces`);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('uses merged view when signal type filter matches a single pipeline', () => {
      const result = configToGraph(multiPipelineConfig, `${SIGNAL_PREFIX}logs`);
      expect(result.isMergedView).toBe(true);

      const nodeIds = result.nodes.map((n) => n.id).sort();
      expect(nodeIds).toEqual(['batch', 'elasticsearch/default', 'otlp']);
      expect(result.edges).toHaveLength(2);
    });
  });

  describe('cross-pipeline connector edges', () => {
    it('creates cross-pipeline edges for a forward connector bridging two pipelines', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['forward'],
            },
            'logs/aggregated': {
              receivers: ['forward'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);
      expect(result.isMergedView).toBe(false);

      const crossEdges = result.edges.filter((e) => e.data?.isCrossGroup);
      expect(crossEdges).toHaveLength(1);
      expect(crossEdges[0]).toMatchObject({
        source: 'logs::forward',
        target: 'logs/aggregated::forward',
      });
    });

    it('creates fan-out cross-pipeline edges when multiple pipelines receive from a connector', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        connectors: { routing: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            'logs/ingest': {
              receivers: ['otlp'],
              exporters: ['routing'],
            },
            'logs/default': {
              receivers: ['routing'],
              exporters: ['elasticsearch/default'],
            },
            'logs/payments': {
              receivers: ['routing'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const crossEdges = result.edges.filter((e) => e.data?.isCrossGroup);
      expect(crossEdges).toHaveLength(2);

      const crossPairs = crossEdges.map((e) => [e.source, e.target]);
      expect(crossPairs).toContainEqual(['logs/ingest::routing', 'logs/default::routing']);
      expect(crossPairs).toContainEqual(['logs/ingest::routing', 'logs/payments::routing']);
    });

    it('creates fan-in cross-pipeline edges when multiple pipelines export to a connector', () => {
      const config: OTelCollectorConfig = {
        receivers: { 'httpcheck/s1': {}, 'httpcheck/s2': {} },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            'metrics/s1': {
              receivers: ['httpcheck/s1'],
              exporters: ['forward'],
            },
            'metrics/s2': {
              receivers: ['httpcheck/s2'],
              exporters: ['forward'],
            },
            metrics: {
              receivers: ['forward'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const crossEdges = result.edges.filter((e) => e.data?.isCrossGroup);
      expect(crossEdges).toHaveLength(2);

      const crossPairs = crossEdges.map((e) => [e.source, e.target]);
      expect(crossPairs).toContainEqual(['metrics/s1::forward', 'metrics::forward']);
      expect(crossPairs).toContainEqual(['metrics/s2::forward', 'metrics::forward']);
    });

    it('applies dashed style to cross-pipeline edges', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['forward'],
            },
            'logs/aggregated': {
              receivers: ['forward'],
              exporters: ['elasticsearch/default'],
            },
          },
        },
      };
      const result = configToGraph(config);

      const crossEdges = result.edges.filter((e) => e.data?.isCrossGroup);
      expect(crossEdges[0].style).toEqual({ strokeDasharray: '6 3' });
    });

    it('does not create cross-pipeline edges in merged view', () => {
      const config: OTelCollectorConfig = {
        receivers: { otlp: {} },
        connectors: { forward: {} },
        exporters: { 'elasticsearch/default': {} },
        service: {
          pipelines: {
            logs: {
              receivers: ['otlp'],
              exporters: ['forward'],
            },
          },
        },
      };
      const result = configToGraph(config, 'logs');
      expect(result.isMergedView).toBe(true);

      const crossEdges = result.edges.filter((e) => e.data?.isCrossGroup);
      expect(crossEdges).toHaveLength(0);
    });
  });
});
