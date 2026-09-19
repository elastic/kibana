/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyEvidenceMetadata, extractMermaid, parseMermaidDecisionTree } from './mermaid';

const TREE = `flowchart TD
    S1([High checkout error rate]) -->|✅| E1[Query error logs]
    E1 -->|✅ database errors| D1{{Connection pool exhausted?}}
    D1 -->|✅ yes| X1((Connection leak in deploy))
    D1 -->|no| E2[Search traces]
    E2 --> X2((Slow query performance))`;

describe('extractMermaid', () => {
  it('returns the fenced block including its fences', () => {
    const markdown = `# Checkout latency\n\nSome prose.\n\n\`\`\`mermaid\n${TREE}\n\`\`\`\n\nMore prose.\n`;

    const extracted = extractMermaid(markdown);

    expect(extracted.startsWith('```mermaid')).toBe(true);
    expect(extracted.endsWith('```')).toBe(true);
    expect(extracted).toContain('S1([High checkout error rate])');
  });

  it('accepts tilde fences and longer fence runs', () => {
    expect(extractMermaid(`~~~~mermaid\n${TREE}\n~~~~\n`)).toContain('flowchart TD');
  });

  it('falls back to a bare flowchart when the file carries no fences', () => {
    const extracted = extractMermaid(`Some heading\n\n${TREE}\n`);

    expect(extracted.startsWith('flowchart TD')).toBe(true);
  });

  it('throws on an unterminated fence rather than silently truncating', () => {
    expect(() => extractMermaid(`\`\`\`mermaid\n${TREE}\n`)).toThrow(
      'Malformed Mermaid code fence in decision-tree file'
    );
  });

  it('throws when the file holds more than one Mermaid block', () => {
    expect(() =>
      extractMermaid(`\`\`\`mermaid\n${TREE}\n\`\`\`\n\n\`\`\`mermaid\n${TREE}\n\`\`\`\n`)
    ).toThrow('Multiple Mermaid code fences found in decision-tree file');
  });

  it('throws when there is no flowchart at all', () => {
    expect(() => extractMermaid('# Notes\n\nNothing structured here.\n')).toThrow(
      'No Mermaid flowchart found in decision-tree file'
    );
  });
});

describe('parseMermaidDecisionTree', () => {
  it('derives each node type from its shape', () => {
    const tree = parseMermaidDecisionTree(TREE, 'symptom:checkout-error-rate');

    const typesById = Object.fromEntries(tree.nodes.map((node) => [node.node_id, node.node_type]));
    expect(typesById).toEqual({
      S1: 'symptom',
      E1: 'evidence_gatherer',
      D1: 'decision',
      X1: 'end',
      E2: 'evidence_gatherer',
      X2: 'end',
    });
    expect(tree.tree_id).toBe('symptom:checkout-error-rate');
  });

  it('records the taken path and strips the checkmark from the condition', () => {
    const tree = parseMermaidDecisionTree(TREE);

    const taken = tree.edges.filter((edge) => edge.is_taken);
    expect(taken.map((edge) => `${edge.source_node_id}->${edge.target_node_id}`)).toEqual([
      'S1->E1',
      'E1->D1',
      'D1->X1',
    ]);
    expect(taken[1].condition).toBe('database errors');
    expect(taken[0].condition).toBe('next');
  });

  it('accepts the single-brace decision shape', () => {
    const tree = parseMermaidDecisionTree('flowchart TD\n  E1[Check] --> D1{Is it broken?}');

    expect(tree.nodes.find((node) => node.node_id === 'D1')?.node_type).toBe('decision');
  });

  it('reads the dash-delimited edge label form', () => {
    const tree = parseMermaidDecisionTree(
      'flowchart TD\n  E1[Check] -- "pool full" --> X1((Leak))'
    );

    expect(tree.edges[0].condition).toBe('pool full');
  });

  it('strips code fences before parsing', () => {
    const tree = parseMermaidDecisionTree(`\`\`\`mermaid\n${TREE}\n\`\`\``);

    expect(tree.nodes).toHaveLength(6);
  });

  it('skips styling directives instead of treating them as nodes', () => {
    const tree = parseMermaidDecisionTree(
      `${TREE}\n    classDef symptom fill:#fff\n    class S1 symptom\n    %% a comment`
    );

    expect(tree.nodes.map((node) => node.node_id).sort()).toEqual([
      'D1',
      'E1',
      'E2',
      'S1',
      'X1',
      'X2',
    ]);
  });

  it('backfills nodes referenced only from an edge', () => {
    const tree = parseMermaidDecisionTree('flowchart TD\n  S1([Symptom]) --> E9');

    const backfilled = tree.nodes.find((node) => node.node_id === 'E9');
    expect(backfilled).toEqual({ node_id: 'E9', node_type: 'evidence_gatherer', label: 'E9' });
  });

  it('collapses duplicate definitions with the last one winning', () => {
    const tree = parseMermaidDecisionTree(
      'flowchart TD\n  S1([First]) --> E1[Check]\n  S1([Second]) --> E2[Other]'
    );

    expect(tree.nodes.find((node) => node.node_id === 'S1')?.label).toBe('Second');
  });

  it('prunes a disconnected component but keeps converging paths', () => {
    const converging = `flowchart TD
    S1([First symptom]) --> D1{{Shared decision}}
    S2([Second symptom]) --> D1
    D1 -->|yes| X1((Root cause))
    S9([Orphan symptom]) --> X9((Orphan end))`;

    const tree = parseMermaidDecisionTree(converging);

    const nodeIds = tree.nodes.map((node) => node.node_id).sort();
    expect(nodeIds).toEqual(['D1', 'S1', 'S2', 'X1']);
    expect(tree.edges).toHaveLength(3);
  });

  it('strips display-only visit counters from labels', () => {
    const tree = parseMermaidDecisionTree(
      'flowchart TD\n  S1([Checkout latency  \u00b7  visits 4 \u00b7 reinforced 2]) --> E1[Check]'
    );

    expect(tree.nodes.find((node) => node.node_id === 'S1')?.label).toBe('Checkout latency');
  });
});

describe('applyEvidenceMetadata', () => {
  it('attaches descriptions to the matching evidence nodes', () => {
    const tree = parseMermaidDecisionTree(TREE);

    applyEvidenceMetadata(tree, [
      'E1: Elasticsearch - Search checkout-* for service=checkout',
      'E2: Elasticsearch - Search APM traces',
    ]);

    expect(tree.nodes.find((node) => node.node_id === 'E1')?.node_metadata).toEqual({
      description: 'Elasticsearch - Search checkout-* for service=checkout',
    });
  });

  it('ignores entries with no separator or no description', () => {
    const tree = parseMermaidDecisionTree(TREE);

    applyEvidenceMetadata(tree, ['E1 no separator', 'E2:   ']);

    expect(tree.nodes.find((node) => node.node_id === 'E1')?.node_metadata).toBeUndefined();
    expect(tree.nodes.find((node) => node.node_id === 'E2')?.node_metadata).toBeUndefined();
  });
});
