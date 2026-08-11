/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { collectDescendantStepIds } from './utils';

const makeStep = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
  } as StreamlangStepWithUIAttributes);

const steps: StreamlangStepWithUIAttributes[] = [
  makeStep('root'),
  makeStep('child1', 'root'),
  makeStep('child2', 'root'),
  makeStep('grandchild1', 'child1'),
  makeStep('grandchild2', 'child1'),
  makeStep('greatGrandchild', 'grandchild1'),
];

describe('collectDescendantStepIds', () => {
  it('returns all descendants for a given parent', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'root'));
    expect(ids).toEqual(['child1', 'grandchild1', 'greatGrandchild', 'grandchild2', 'child2']);
  });

  it('returns only subtree descendants', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'child1'));
    expect(ids).toEqual(['grandchild1', 'greatGrandchild', 'grandchild2']);
  });

  it('returns empty set when no descendants exist', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'leaf'));
    expect(ids).toEqual([]);
  });
});
