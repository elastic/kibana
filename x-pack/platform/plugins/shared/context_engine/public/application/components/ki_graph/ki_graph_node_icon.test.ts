/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getKiGraphNodeIcon,
  KI_GRAPH_DOCUMENT_KIND_ICON,
  KI_GRAPH_MEMORY_ICON,
  KI_GRAPH_CRAWLER_ICON,
  KI_GRAPH_WORKFLOW_ICON,
} from './ki_graph_node_icon';
import type { KiGraphNodeKind } from './types';

describe('getKiGraphNodeIcon', () => {
  const kinds: KiGraphNodeKind[] = ['fact', 'entity', 'memory', 'document', 'workflow', 'crawler'];

  it('returns a non-empty icon for every kind', () => {
    for (const kind of kinds) {
      const icon = getKiGraphNodeIcon(kind, 'example');
      expect(icon.length).toBeGreaterThan(0);
    }
  });

  it('uses fixed icons for memory, document and workflow', () => {
    expect(getKiGraphNodeIcon('memory', 'anything')).toBe(KI_GRAPH_MEMORY_ICON);
    expect(getKiGraphNodeIcon('document', 'note')).toBe(KI_GRAPH_DOCUMENT_KIND_ICON);
    expect(getKiGraphNodeIcon('workflow', '')).toBe(KI_GRAPH_WORKFLOW_ICON);
    expect(getKiGraphNodeIcon('crawler', '')).toBe(KI_GRAPH_CRAWLER_ICON);
  });

  it('keeps fact and entity subtype rules', () => {
    expect(getKiGraphNodeIcon('fact', 'preference')).toBe('document');
    expect(getKiGraphNodeIcon('entity', 'person')).toBe('user');
    expect(getKiGraphNodeIcon('entity', 'custom-topic')).toBe('cluster');
  });
});
