/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenPipelineSection } from './flatten_pipeline_section';
import { PluginStatement } from '../pipeline/plugin_statement';
import { IfStatement } from '../pipeline/if_statement';

describe('flattenPipelineSection', () => {
  let pipelineSection;

  beforeEach(() => {
    pipelineSection = [];
  });

  it('creates list for only-plugin pipeline section', () => {
    pipelineSection = [
      PluginStatement.fromPipelineGraphVertex({ id: 'first' }),
      PluginStatement.fromPipelineGraphVertex({ id: 'second' }),
    ];

    const result = flattenPipelineSection(pipelineSection, 0, null);

    expect(result).toHaveLength(2);
    expect(result[0].parentId).toBe(null);
    expect(result[0].depth).toBe(0);
    expect(result[0].id).toBe('first');
    expect(result[1].parentId).toBe(null);
    expect(result[1].depth).toBe(0);
    expect(result[1].id).toBe('second');
  });

  it('flattens pipeline with if statement', () => {
    pipelineSection = [
      PluginStatement.fromPipelineGraphVertex({ id: 'first' }),
      new IfStatement(
        { id: 'if_parent' },
        [PluginStatement.fromPipelineGraphVertex({ id: 'if_child1' })],
        []
      ),
    ];

    const result = flattenPipelineSection(pipelineSection, 0, null);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('first');
    expect(result[1].id).toBe('if_parent');
    expect(result[1].parentId).toBe(null);
    expect(result[1].depth).toBe(0);
    expect(result[2].id).toBe('if_child1');
    expect(result[2].parentId).toBe('if_parent');
    expect(result[2].depth).toBe(1);
  });

  it('flattens pipeline with else statement', () => {
    pipelineSection = [
      new IfStatement(
        { id: 'if_parent' },
        [PluginStatement.fromPipelineGraphVertex({ id: 'if_child1' })],
        [PluginStatement.fromPipelineGraphVertex({ id: 'else_child1' })]
      ),
    ];

    const result = flattenPipelineSection(pipelineSection, 0, null);

    expect(result).toHaveLength(4);
    expect(result[0].id).toBe('if_parent');

    expect(result[1].id).toBe('if_child1');
    expect(result[1].parentId).toBe('if_parent');
    expect(result[1].depth).toBe(1);

    expect(result[2].constructor.name).toBe('ElseElement');
    expect(result[2].depth).toBe(0);
    expect(result[2].parentId).toBe(null);

    expect(result[3].id).toBe('else_child1');
    expect(result[3].parentId).toBe('if_parent_else');
    expect(result[3].depth).toBe(1);
  });

  it('flattens pipeline section with if/else and nested if', () => {
    pipelineSection = [
      new IfStatement(
        { id: 'if_parent' },
        [PluginStatement.fromPipelineGraphVertex({ id: 'if_child1' })],
        [
          new IfStatement(
            { id: 'if_parent2' },
            [PluginStatement.fromPipelineGraphVertex({ id: 'if_child2' })],
            []
          ),
          PluginStatement.fromPipelineGraphVertex({ id: 'else_child1' }),
        ]
      ),
    ];

    const result = flattenPipelineSection(pipelineSection, 0, null);

    expect(result).toHaveLength(6);
    expect(result[1].id).toBe('if_child1');
    expect(result[1].depth).toBe(1);
    expect(result[1].parentId).toBe('if_parent');

    expect(result[2].id).toBe('if_parent_else');
    expect(result[2].depth).toBe(0);
    expect(result[2].parentId).toBe(null);

    expect(result[3].id).toBe('if_parent2');
    expect(result[3].depth).toBe(1);
    expect(result[3].parentId).toBe('if_parent_else');

    expect(result[4].id).toBe('if_child2');
    expect(result[4].depth).toBe(2);
    expect(result[4].parentId).toBe('if_parent2');

    expect(result[5].id).toBe('else_child1');
    expect(result[5].depth).toBe(1);
    expect(result[5].parentId).toBe('if_parent_else');
  });
});
