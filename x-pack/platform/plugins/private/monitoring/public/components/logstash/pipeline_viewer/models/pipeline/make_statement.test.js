/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeStatement } from './make_statement';
import { PluginVertex } from '../graph/plugin_vertex';
import { IfVertex } from '../graph/if_vertex';
import { QueueVertex } from '../graph/queue_vertex';
import { PluginStatement } from './plugin_statement';
import { IfStatement } from './if_statement';
import { Queue } from './queue';

describe('makeStatement', () => {
  it('can make a PluginStatement from a PluginVertex', () => {
    const pluginVertex = new PluginVertex({}, { json: { id: 'my_grok' } });
    const actual = makeStatement(pluginVertex, 'output');
    expect(actual).toBeInstanceOf(PluginStatement);
  });

  it('can make an IfStatement from an IfVertex', () => {
    // output {
    //   if (...) {
    //     elasticsearch {
    //       id => es_output
    //     }
    //   }
    // }

    const esVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'es_output' });
    esVertex.pipelineStage = 'output';

    const ifVertex = new IfVertex(
      { edgesByFrom: { abcde0: [{ when: true, to: esVertex }] } },
      { json: { id: 'abcdef0' } }
    );
    const actual = makeStatement(ifVertex, 'output');
    expect(actual).toBeInstanceOf(IfStatement);
  });

  it('can make a Queue from a QueueVertex', () => {
    const queueVertex = new QueueVertex({}, { json: { id: '__QUEUE__' } });
    const actual = makeStatement(queueVertex);
    expect(actual).toBeInstanceOf(Queue);
  });

  it('throws an error for an unknown type of vertex', () => {
    const unknownVertex = {};
    expect(() => {
      makeStatement(unknownVertex, 'output');
    }).toThrow();
  });
});
