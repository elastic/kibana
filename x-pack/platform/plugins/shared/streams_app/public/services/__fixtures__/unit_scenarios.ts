/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from '@kbn/streams-schema';
import type { UnitSource } from '../../components/streams_layout/sources/source_models';
import {
  connectLine,
  disconnectLine,
  moveLine,
  type UnconnectedPipelineReason,
} from '../unit_connections';
import type { UnitPipeline, UnitSignal } from '../unit_pipeline';
import type { UnitProcessor } from '../unit_processing';
import type { Unit } from '../unit_repository';

/**
 * A known-good unit and what the map must make of it: the nodes and lines it
 * draws, the pipelines it refuses to save, and the YAML each manipulation of a
 * line produces. Every unit here is one the distributor accepts.
 *
 * Node keys are `processing:<node id>` and `routing:<pipeline id>`, with
 * ` (locked)` for processing nothing can edit and ` (synthetic)` for a bare
 * delegated child drawn as a one-rule router. Line keys are
 * `<from> -> <to> via <list>`, where the list is the pipeline entry the line
 * is stored in or `structure` for a pipeline's own processing-to-routing line,
 * with ` (locked)` for lines that cannot be moved.
 */
export interface UnitScenario {
  name: string;
  unit: Unit;
  /** Sources and destinations placed on the canvas. Defaults to all of the unit's. */
  sourceIds?: string[];
  destinationIds?: string[];
  nodes: string[];
  edges: string[];
  unconnected?: Array<{ pipelineId: string; reason: UnconnectedPipelineReason }>;
  manipulations?: UnitManipulation[];
}

export type UnitManipulation =
  | { name: string; apply: (unit: Unit) => Unit; pipelines: UnitPipeline[] }
  | { name: string; apply: (unit: Unit) => Unit; refused: true };

const source = (id: string, supportedTelemetry: UnitSignal[] = ['logs']): UnitSource => ({
  id,
  type: 'otlp',
  supported_telemetry: supportedTelemetry,
});

const destination = (id: string, supportedTelemetry: UnitSignal[] = ['logs']): UnitDestination => ({
  id,
  type: 'elasticsearch',
  supported_telemetry: supportedTelemetry,
});

const processor = (id: string, supportedTelemetry: UnitSignal[] = ['logs']): UnitProcessor => ({
  id,
  type: 'add_fields',
  supported_telemetry: supportedTelemetry,
});

const pipeline = (
  id: string,
  config: UnitPipeline['config'],
  supportedTelemetry: UnitSignal[] = ['logs']
): UnitPipeline => ({ id, supported_telemetry: supportedTelemetry, config });

const unit = ({
  sources = [],
  destinations = [],
  processors,
  pipelines,
}: {
  sources?: UnitSource[];
  destinations?: UnitDestination[];
  processors?: UnitProcessor[];
  pipelines: UnitPipeline[];
}): Unit => ({
  unit: {
    sources,
    destinations,
    ...(processors ? { processors } : {}),
    pipelines,
  },
  ui_metadata: {},
});

const src = { kind: 'source', id: 'in' } as const;
const srcB = { kind: 'source', id: 'b' } as const;
const dest = (id: string) => ({ kind: 'destination', id } as const);
const pipe = (id: string) => ({ kind: 'pipeline', id } as const);
const rule = (pipelineId: string, ruleIndex: number) =>
  ({ kind: 'rule', rule: { pipelineId, ruleIndex } } as const);
const pipelineProcessing = (pipelineId: string) =>
  ({ kind: 'processing', ref: { kind: 'pipeline', pipelineId } } as const);
const routeProcessing = (pipelineId: string, routeIndex: number) =>
  ({ kind: 'processing', ref: { kind: 'route', pipelineId, routeIndex } } as const);

export const unitScenarios: UnitScenario[] = [
  {
    name: 'one direct line',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es'), destination('archive')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es'] },
        ]),
      ],
    }),
    nodes: [],
    edges: ['source:in -> destination:es via destinations'],
    manipulations: [
      {
        name: 'unhooking the line removes the pipeline',
        apply: (u) => disconnectLine(u, src, dest('es')),
        pipelines: [],
      },
      {
        name: 'a second line from the source joins the same pipeline',
        apply: (u) => connectLine(u, src, dest('archive')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            { name: 'destinations', value: ['es', 'archive'] },
          ]),
        ],
      },
      {
        name: 'drawing the same line again is refused',
        apply: (u) => connectLine(u, src, dest('es')),
        refused: true,
      },
    ],
  },
  {
    name: 'fan-out over two pipelines',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es'), destination('archive')],
      pipelines: [
        pipeline('p-in', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es'] },
        ]),
        pipeline('p-in-2', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['archive'] },
        ]),
      ],
    }),
    nodes: [],
    edges: [
      'source:in -> destination:es via destinations',
      'source:in -> destination:archive via destinations',
    ],
    manipulations: [
      {
        name: 'unhooking one line leaves the other pipeline alone',
        apply: (u) => disconnectLine(u, src, dest('archive')),
        pipelines: [
          pipeline('p-in', [
            { name: 'sources', value: ['in'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
    ],
  },
  {
    name: 'two sources sharing a pipeline',
    unit: unit({
      sources: [source('a'), source('b')],
      destinations: [destination('es')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['a', 'b'] },
          { name: 'destinations', value: ['es'] },
        ]),
      ],
    }),
    nodes: [],
    edges: [
      'source:a -> destination:es via destinations',
      'source:b -> destination:es via destinations',
    ],
    manipulations: [
      {
        name: 'unhooking one source leaves the other on the pipeline',
        apply: (u) => disconnectLine(u, { kind: 'source', id: 'a' }, dest('es')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['b'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
    ],
  },
  {
    name: 'a processing pipeline',
    unit: unit({
      sources: [source('in'), source('b')],
      destinations: [destination('es')],
      processors: [processor('tag')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'processors', value: ['tag'] },
          { name: 'destinations', value: ['es'] },
        ]),
      ],
    }),
    nodes: ['processing:processing-pipeline-main'],
    edges: [
      'source:in -> processing:processing-pipeline-main via sources',
      'processing:processing-pipeline-main -> destination:es via destinations',
    ],
    manipulations: [
      {
        name: 'unhooking the outbound line keeps the node without a destination',
        apply: (u) => disconnectLine(u, pipelineProcessing('main'), dest('es')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
          ]),
        ],
      },
      {
        name: 'unhooking the inbound line keeps the node without a source',
        apply: (u) => disconnectLine(u, src, pipe('main')),
        pipelines: [
          pipeline('main', [
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
      {
        name: 'a second source fans in to the node',
        apply: (u) => connectLine(u, srcB, pipe('main')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in', 'b'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
      {
        name: 'the inbound line moves to another source',
        apply: (u) =>
          moveLine(u, {
            previousOrigin: src,
            previousTarget: pipe('main'),
            origin: srcB,
            target: pipe('main'),
          }),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['b'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
      {
        name: 'a direct line beside the node is refused since the source already reaches es',
        apply: (u) => connectLine(u, src, dest('es')),
        refused: true,
      },
    ],
  },
  {
    name: 'routing rules with route processing (full dev flow unit)',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es-prod'), destination('es-dev')],
      processors: [processor('uppercase-message')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          {
            name: 'routes',
            value: [
              {
                when: 'resource.attributes["env"] == "prod"',
                destinations: ['es-prod'],
                processors: ['uppercase-message'],
              },
              { when: 'resource.attributes["env"] == "dev"', destinations: ['es-dev'] },
            ],
          },
        ]),
      ],
    }),
    nodes: ['processing:processing-route-main-0', 'routing:main'],
    edges: [
      'source:in -> routing:main via sources',
      'rule:main:0 -> processing:processing-route-main-0 via structure (locked)',
      'processing:processing-route-main-0 -> destination:es-prod via routeDestinations',
      'rule:main:1 -> destination:es-dev via routeDestinations',
    ],
    manipulations: [
      {
        name: 'unhooking a rule keeps it in place without a target',
        apply: (u) => disconnectLine(u, rule('main', 1), dest('es-dev')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [
                {
                  when: 'resource.attributes["env"] == "prod"',
                  destinations: ['es-prod'],
                  processors: ['uppercase-message'],
                },
                { when: 'resource.attributes["env"] == "dev"', destinations: [] },
              ],
            },
          ]),
        ],
      },
      {
        name: "unhooking the route processing's line unhooks its rule",
        apply: (u) => disconnectLine(u, routeProcessing('main', 0), dest('es-prod')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [
                {
                  when: 'resource.attributes["env"] == "prod"',
                  destinations: [],
                  processors: ['uppercase-message'],
                },
                { when: 'resource.attributes["env"] == "dev"', destinations: ['es-dev'] },
              ],
            },
          ]),
        ],
      },
      {
        name: 'a rule line moves to another destination in place',
        apply: (u) =>
          moveLine(u, {
            previousOrigin: rule('main', 1),
            previousTarget: dest('es-dev'),
            origin: rule('main', 1),
            target: dest('es-prod'),
          }),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [
                {
                  when: 'resource.attributes["env"] == "prod"',
                  destinations: ['es-prod'],
                  processors: ['uppercase-message'],
                },
                { when: 'resource.attributes["env"] == "dev"', destinations: ['es-prod'] },
              ],
            },
          ]),
        ],
      },
      {
        name: 'unhooking the inbound line keeps the routing node without a source',
        apply: (u) => disconnectLine(u, src, pipe('main')),
        pipelines: [
          pipeline('main', [
            {
              name: 'routes',
              value: [
                {
                  when: 'resource.attributes["env"] == "prod"',
                  destinations: ['es-prod'],
                  processors: ['uppercase-message'],
                },
                { when: 'resource.attributes["env"] == "dev"', destinations: ['es-dev'] },
              ],
            },
          ]),
        ],
      },
    ],
  },
  {
    name: 'processing in front of a routing node',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es'), destination('archive')],
      processors: [processor('parse')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'processors', value: ['parse'] },
          { name: 'routes', value: [{ destinations: ['es'] }] },
        ]),
      ],
    }),
    nodes: ['processing:processing-pipeline-main', 'routing:main'],
    edges: [
      'source:in -> processing:processing-pipeline-main via sources',
      'processing:processing-pipeline-main -> routing:main via structure (locked)',
      'rule:main:0 -> destination:es via routeDestinations',
    ],
    manipulations: [
      {
        name: 'the processing node cannot bypass its routing node',
        apply: (u) => connectLine(u, pipelineProcessing('main'), dest('archive')),
        refused: true,
      },
      {
        name: 'the rule takes a second destination',
        apply: (u) => connectLine(u, rule('main', 0), dest('archive')),
        pipelines: [
          pipeline('main', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['parse'] },
            { name: 'routes', value: [{ destinations: ['es', 'archive'] }] },
          ]),
        ],
      },
    ],
  },
  {
    name: 'delegation to a bare child',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es-prod'), destination('es-dev')],
      pipelines: [
        pipeline('parent', [
          { name: 'sources', value: ['in'] },
          {
            name: 'routes',
            value: [{ when: 'env == "prod"', pipelines: ['child'] }, { destinations: ['es-dev'] }],
          },
        ]),
        pipeline('child', [{ name: 'destinations', value: ['es-prod'] }]),
      ],
    }),
    nodes: ['routing:parent', 'routing:child (synthetic)'],
    edges: [
      'source:in -> routing:parent via sources',
      'rule:parent:0 -> routing:child via routePipelines',
      'rule:parent:1 -> destination:es-dev via routeDestinations',
      'rule:child:0 -> destination:es-prod via destinations',
    ],
    manipulations: [
      {
        name: 'unhooking the delegation keeps the child, now without a source',
        apply: (u) => disconnectLine(u, rule('parent', 0), pipe('child')),
        pipelines: [
          pipeline('parent', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [{ when: 'env == "prod"', pipelines: [] }, { destinations: ['es-dev'] }],
            },
          ]),
          pipeline('child', [{ name: 'destinations', value: ['es-prod'] }]),
        ],
      },
      {
        name: 'a source cannot be dropped on a delegated child',
        apply: (u) => connectLine(u, src, pipe('child')),
        refused: true,
      },
      {
        name: "the child's last destination cannot be unhooked, or the child would vanish",
        apply: (u) => disconnectLine(u, rule('child', 0), dest('es-prod')),
        refused: true,
      },
      {
        name: 'the catch-all rule moves from a destination onto the child',
        apply: (u) =>
          moveLine(u, {
            previousOrigin: rule('parent', 1),
            previousTarget: dest('es-dev'),
            origin: rule('parent', 1),
            target: pipe('child'),
          }),
        pipelines: [
          pipeline('parent', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [{ when: 'env == "prod"', pipelines: ['child'] }, { pipelines: ['child'] }],
            },
          ]),
          pipeline('child', [{ name: 'destinations', value: ['es-prod'] }]),
        ],
      },
      {
        name: 'the child cannot route back to its parent',
        apply: (u) => connectLine(u, rule('child', 0), pipe('parent')),
        refused: true,
      },
    ],
  },
  {
    name: 'delegation to a child with processors',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es')],
      processors: [processor('tag')],
      pipelines: [
        pipeline('parent', [
          { name: 'sources', value: ['in'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ]),
        pipeline('child', [
          { name: 'processors', value: ['tag'] },
          { name: 'destinations', value: ['es'] },
        ]),
      ],
    }),
    nodes: ['processing:processing-pipeline-child', 'routing:parent'],
    edges: [
      'source:in -> routing:parent via sources',
      'rule:parent:0 -> processing:processing-pipeline-child via routePipelines',
      'processing:processing-pipeline-child -> destination:es via destinations',
    ],
    manipulations: [
      {
        name: "unhooking the child's line keeps its node without a destination",
        apply: (u) => disconnectLine(u, pipelineProcessing('child'), dest('es')),
        pipelines: [
          pipeline('parent', [
            { name: 'sources', value: ['in'] },
            { name: 'routes', value: [{ pipelines: ['child'] }] },
          ]),
          pipeline('child', [{ name: 'processors', value: ['tag'] }]),
        ],
      },
    ],
  },
  {
    name: 'delegation to a child with routes',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es-a'), destination('es-b')],
      pipelines: [
        pipeline('parent', [
          { name: 'sources', value: ['in'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ]),
        pipeline('child', [
          {
            name: 'routes',
            value: [{ when: 'kind == "a"', destinations: ['es-a'] }, { destinations: ['es-b'] }],
          },
        ]),
      ],
    }),
    nodes: ['routing:parent', 'routing:child'],
    edges: [
      'source:in -> routing:parent via sources',
      'rule:parent:0 -> routing:child via routePipelines',
      'rule:child:0 -> destination:es-a via routeDestinations',
      'rule:child:1 -> destination:es-b via routeDestinations',
    ],
  },
  {
    name: 'two rules delegating to one child',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es-prod'), destination('es-dev')],
      pipelines: [
        pipeline('parent', [
          { name: 'sources', value: ['in'] },
          {
            name: 'routes',
            value: [
              { when: 'env == "prod"', pipelines: ['child'] },
              { when: 'env == "staging"', pipelines: ['child'] },
              { destinations: ['es-dev'] },
            ],
          },
        ]),
        pipeline('child', [{ name: 'destinations', value: ['es-prod'] }]),
      ],
    }),
    nodes: ['routing:parent', 'routing:child (synthetic)'],
    edges: [
      'source:in -> routing:parent via sources',
      'rule:parent:0 -> routing:child via routePipelines',
      'rule:parent:1 -> routing:child via routePipelines',
      'rule:parent:2 -> destination:es-dev via routeDestinations',
      'rule:child:0 -> destination:es-prod via destinations',
    ],
    manipulations: [
      {
        name: 'unhooking one delegation leaves the child fed by the other',
        apply: (u) => disconnectLine(u, rule('parent', 0), pipe('child')),
        pipelines: [
          pipeline('parent', [
            { name: 'sources', value: ['in'] },
            {
              name: 'routes',
              value: [
                { when: 'env == "prod"', pipelines: [] },
                { when: 'env == "staging"', pipelines: ['child'] },
                { destinations: ['es-dev'] },
              ],
            },
          ]),
          pipeline('child', [{ name: 'destinations', value: ['es-prod'] }]),
        ],
      },
    ],
  },
  {
    name: 'telemetry-scoped routes entries',
    unit: unit({
      sources: [source('in', ['logs', 'metrics']), source('b', ['logs'])],
      destinations: [destination('es-logs'), destination('es-metrics', ['metrics'])],
      pipelines: [
        pipeline(
          'main',
          [
            { name: 'sources', value: ['in'] },
            { name: 'routes', value: [{ destinations: ['es-logs'] }], telemetry: ['logs'] },
            { name: 'routes', value: [{ destinations: ['es-metrics'] }], telemetry: ['metrics'] },
          ],
          ['logs', 'metrics']
        ),
      ],
    }),
    nodes: ['routing:main'],
    edges: [
      'source:in -> routing:main via sources (locked)',
      'rule:main:0 -> destination:es-logs via routeDestinations (locked)',
      'rule:main:1 -> destination:es-metrics via routeDestinations (locked)',
    ],
    manipulations: [
      {
        name: 'a source cannot join scoped wiring',
        apply: (u) => connectLine(u, srcB, pipe('main')),
        refused: true,
      },
      {
        name: 'a scoped rule cannot be unhooked',
        apply: (u) => disconnectLine(u, rule('main', 0), dest('es-logs')),
        refused: true,
      },
    ],
  },
  {
    name: 'telemetry-scoped destinations entries',
    unit: unit({
      sources: [source('in', ['logs', 'metrics'])],
      destinations: [destination('es-logs'), destination('es-metrics', ['metrics'])],
      pipelines: [
        pipeline(
          'main',
          [
            { name: 'sources', value: ['in'] },
            { name: 'destinations', value: ['es-logs'], telemetry: ['logs'] },
            { name: 'destinations', value: ['es-metrics'], telemetry: ['metrics'] },
          ],
          ['logs', 'metrics']
        ),
      ],
    }),
    nodes: [],
    edges: [
      'source:in -> destination:es-logs via destinations (locked)',
      'source:in -> destination:es-metrics via destinations (locked)',
    ],
    manipulations: [
      {
        name: 'a scoped line cannot be unhooked',
        apply: (u) => disconnectLine(u, src, dest('es-logs')),
        refused: true,
      },
    ],
  },
  {
    name: 'per-telemetry processors entries',
    unit: unit({
      sources: [source('in', ['logs', 'metrics'])],
      destinations: [destination('es', ['logs', 'metrics'])],
      processors: [processor('tag-logs'), processor('tag-metrics', ['metrics'])],
      pipelines: [
        pipeline(
          'main',
          [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag-logs'], telemetry: ['logs'] },
            { name: 'processors', value: ['tag-metrics'], telemetry: ['metrics'] },
            { name: 'destinations', value: ['es'] },
          ],
          ['logs', 'metrics']
        ),
      ],
    }),
    nodes: ['processing:processing-pipeline-main (locked)'],
    edges: [
      'source:in -> processing:processing-pipeline-main via sources',
      'processing:processing-pipeline-main -> destination:es via destinations',
    ],
  },
  {
    name: 'nodes nothing feeds and nodes going nowhere',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es')],
      processors: [processor('tag')],
      pipelines: [
        pipeline('orphan', [
          { name: 'processors', value: ['tag'] },
          { name: 'destinations', value: ['es'] },
        ]),
        pipeline('dead-end', [
          { name: 'sources', value: ['in'] },
          { name: 'processors', value: ['tag'] },
        ]),
        pipeline('lonely-router', [
          { name: 'routes', value: [{ when: 'env == "prod"', destinations: ['es'] }] },
        ]),
      ],
    }),
    nodes: [
      'processing:processing-pipeline-orphan',
      'processing:processing-pipeline-dead-end',
      'routing:lonely-router',
    ],
    edges: [
      'processing:processing-pipeline-orphan -> destination:es via destinations',
      'source:in -> processing:processing-pipeline-dead-end via sources',
      'rule:lonely-router:0 -> destination:es via routeDestinations',
    ],
    unconnected: [
      { pipelineId: 'orphan', reason: 'noSource' },
      { pipelineId: 'dead-end', reason: 'noDestination' },
      { pipelineId: 'lonely-router', reason: 'noSource' },
    ],
    manipulations: [
      {
        name: 'a source feeds the orphan node',
        apply: (u) => connectLine(u, src, pipe('orphan')),
        pipelines: [
          pipeline('orphan', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
          pipeline('dead-end', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
          ]),
          pipeline('lonely-router', [
            { name: 'routes', value: [{ when: 'env == "prod"', destinations: ['es'] }] },
          ]),
        ],
      },
      {
        name: 'the dead-end node takes a destination',
        apply: (u) => connectLine(u, pipelineProcessing('dead-end'), dest('es')),
        pipelines: [
          pipeline('orphan', [
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
          pipeline('dead-end', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
          pipeline('lonely-router', [
            { name: 'routes', value: [{ when: 'env == "prod"', destinations: ['es'] }] },
          ]),
        ],
      },
      {
        name: 'the source cannot deliver to es through both nodes',
        apply: (u) =>
          connectLine(
            connectLine(u, src, pipe('orphan')),
            pipelineProcessing('dead-end'),
            dest('es')
          ),
        pipelines: [
          pipeline('orphan', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
          pipeline('dead-end', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
          ]),
          pipeline('lonely-router', [
            { name: 'routes', value: [{ when: 'env == "prod"', destinations: ['es'] }] },
          ]),
        ],
      },
      {
        name: 'a source feeds the lonely routing node',
        apply: (u) => connectLine(u, src, pipe('lonely-router')),
        pipelines: [
          pipeline('orphan', [
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
          pipeline('dead-end', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
          ]),
          pipeline('lonely-router', [
            { name: 'sources', value: ['in'] },
            { name: 'routes', value: [{ when: 'env == "prod"', destinations: ['es'] }] },
          ]),
        ],
      },
    ],
  },
  {
    name: 'components not on the canvas',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es'), destination('archive')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es', 'archive'] },
        ]),
      ],
    }),
    destinationIds: ['es'],
    nodes: [],
    edges: ['source:in -> destination:es via destinations'],
  },
  {
    name: 'a source already delivering to a destination',
    unit: unit({
      sources: [source('in')],
      destinations: [destination('es')],
      processors: [processor('tag')],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es'] },
        ]),
        pipeline('proc', [
          { name: 'processors', value: ['tag'] },
          { name: 'destinations', value: ['es'] },
        ]),
      ],
    }),
    nodes: ['processing:processing-pipeline-proc'],
    edges: [
      'source:in -> destination:es via destinations',
      'processing:processing-pipeline-proc -> destination:es via destinations',
    ],
    unconnected: [{ pipelineId: 'proc', reason: 'noSource' }],
    manipulations: [
      {
        name: 'cannot also feed a node that delivers to the same destination',
        apply: (u) => connectLine(u, src, pipe('proc')),
        refused: true,
      },
      {
        name: 'feeds the node once its direct line is unhooked',
        apply: (u) => connectLine(disconnectLine(u, src, dest('es')), src, pipe('proc')),
        pipelines: [
          pipeline('proc', [
            { name: 'sources', value: ['in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es'] },
          ]),
        ],
      },
    ],
  },
  {
    name: 'a source and a destination with no shared signal',
    unit: unit({
      sources: [source('in', ['logs'])],
      destinations: [destination('es-logs'), destination('es-metrics', ['metrics'])],
      pipelines: [
        pipeline('main', [
          { name: 'sources', value: ['in'] },
          { name: 'destinations', value: ['es-logs'] },
        ]),
      ],
    }),
    nodes: [],
    edges: ['source:in -> destination:es-logs via destinations'],
    manipulations: [
      {
        name: 'a direct line to a metrics-only destination is refused',
        apply: (u) => connectLine(u, src, dest('es-metrics')),
        refused: true,
      },
    ],
  },
];
