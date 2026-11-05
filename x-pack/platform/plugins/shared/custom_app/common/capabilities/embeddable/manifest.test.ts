/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from '@kbn/custom-app-common';
import { checkCapability } from '@kbn/custom-app-registry';
import { embeddableCapability, MAX_EMBEDDABLE_STATE_LENGTH } from './manifest';

const documentWith = (node: Record<string, unknown>) => ({
  state: {},
  root: { type: 'stack', id: 'root', direction: 'vertical', children: [node] },
});

const panel = (overrides: Record<string, unknown> = {}) => ({
  type: 'embeddable',
  id: 'notes',
  embeddableType: 'markdown',
  state: { content: '# Notes' },
  ...overrides,
});

describe('the embeddable capability', () => {
  it('has nothing wrong with it', () => {
    expect(checkCapability(embeddableCapability)).toEqual([]);
  });

  it('takes the type of a panel and its state, as a dashboard keeps them', () => {
    expect(appDocumentSchema.safeParse(documentWith(panel())).success).toBe(true);
  });

  it('refuses a type that is not a name, and a state that is too big or missing', () => {
    expect(
      appDocumentSchema.safeParse(documentWith(panel({ embeddableType: 'a b/c' }))).success
    ).toBe(false);
    expect(appDocumentSchema.safeParse(documentWith(panel({ state: undefined }))).success).toBe(
      false
    );
    expect(
      appDocumentSchema.safeParse(
        documentWith(panel({ state: { content: 'x'.repeat(MAX_EMBEDDABLE_STATE_LENGTH) } }))
      ).success
    ).toBe(false);
  });

  it('keeps its height within what a panel can sensibly be', () => {
    expect(appDocumentSchema.safeParse(documentWith(panel({ height: 20 }))).success).toBe(false);
    expect(appDocumentSchema.safeParse(documentWith(panel({ height: 400 }))).success).toBe(true);
  });
});
