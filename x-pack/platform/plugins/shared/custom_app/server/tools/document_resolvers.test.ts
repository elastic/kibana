/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDocumentResolver } from '@kbn/custom-app-registry';
import { resolveDocument } from './document_resolvers';

const context = {} as Parameters<typeof resolveDocument>[1];
const documentOf = (title: string) =>
  ({ state: {}, root: { type: 'heading', id: 'h', text: title } } as never);

describe('resolving a document', () => {
  it('runs each resolver in turn on what the one before gave', async () => {
    registerDocumentResolver(async (document) => ({
      document: {
        ...document,
        root: {
          ...document.root,
          text: `${(document.root as never as { text: string }).text} one`,
        },
      } as never,
    }));
    registerDocumentResolver(async (document) => ({
      document: {
        ...document,
        root: {
          ...document.root,
          text: `${(document.root as never as { text: string }).text} two`,
        },
      } as never,
    }));

    const resolved = await resolveDocument(documentOf('start'), context);

    expect(resolved).toEqual({
      document: expect.objectContaining({
        root: expect.objectContaining({ text: 'start one two' }),
      }),
    });
  });

  it('stops at the first resolver that cannot finish the document, and says why', async () => {
    registerDocumentResolver(async () => ({ error: 'no model' }));
    registerDocumentResolver(jest.fn());

    expect(await resolveDocument(documentOf('x'), context)).toEqual({ error: 'no model' });
  });
});
