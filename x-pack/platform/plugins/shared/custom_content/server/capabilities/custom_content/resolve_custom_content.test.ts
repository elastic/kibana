/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvableDocument } from '@kbn/custom-app-registry';
import { MAX_TEMPLATES_PER_CALL, resolveCustomContent } from './resolve_custom_content';

const resolver = jest.fn();

const panel = (
  id: string,
  state: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) => ({
  type: 'embeddable',
  id,
  embeddableType: 'custom_content',
  state,
  ...extra,
});

const documentOf = (children: unknown[], state: Record<string, unknown> = {}) =>
  ({ state, root: { type: 'stack', id: 'root', children } } as ResolvableDocument);

const childrenOf = (result: Awaited<ReturnType<typeof resolveCustomContent>>) => {
  if ('error' in result) throw new Error(result.error);
  return (result.document.root as { children: unknown[] }).children;
};

describe('resolveCustomContent', () => {
  beforeEach(() => {
    resolver.mockReset().mockResolvedValue({ template: '<p>written</p>', height: 360 });
  });

  it('writes the template of a panel that has a prompt, and drops the prompt', async () => {
    const document = documentOf([
      panel('board', { esql_query: ['FROM status'], prompt: 'A status board' }),
    ]);

    const [node] = childrenOf(await resolveCustomContent(document, resolver));

    expect(node).toEqual({
      type: 'embeddable',
      id: 'board',
      embeddableType: 'custom_content',
      height: 360,
      state: { esql_query: ['FROM status'], template: '<p>written</p>' },
    });
    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'A status board', esqlQuery: 'FROM status' })
    );
  });

  it('refines the template a panel already has, instead of starting again', async () => {
    const document = documentOf([
      panel('board', { template: '<b>old</b>', prompt: 'Make it blue' }),
    ]);

    await resolveCustomContent(document, resolver);

    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ existingTemplate: '<b>old</b>', esqlQuery: undefined })
    );
  });

  it('leaves a panel with no prompt, and anything that is not custom content, as it is', async () => {
    const document = documentOf([
      panel('board', { template: '<b>keep</b>' }),
      { type: 'embeddable', id: 'notes', embeddableType: 'markdown', state: { prompt: 'x' } },
      { type: 'heading', id: 'title', text: 'Hi' },
    ]);

    const result = await resolveCustomContent(document, resolver);

    expect(resolver).not.toHaveBeenCalled();
    expect(childrenOf(result)).toEqual((document.root as { children: unknown[] }).children);
  });

  it('finds panels inside others, such as a flyout or the tab of a page', async () => {
    const document = documentOf([
      {
        type: 'tabs',
        id: 'tabs',
        children: [
          {
            type: 'section',
            id: 'tab',
            label: 'Board',
            children: [
              { type: 'card', id: 'card', children: [panel('inner', { prompt: 'A note' })] },
            ],
          },
        ],
      },
    ]);

    const result = await resolveCustomContent(document, resolver);

    if ('error' in result) throw new Error(result.error);
    expect(JSON.stringify(result.document.root)).toContain('<p>written</p>');
    expect(JSON.stringify(result.document.root)).not.toContain('"prompt"');
  });

  it('tries a query that has parameters with the defaults of the values it uses', async () => {
    const document = documentOf(
      [
        panel('board', {
          esql_query: ['FROM logs | WHERE service == ?service AND x == ?other'],
          prompt: 'Board',
        }),
      ],
      { service: { type: 'string', default: 'cart' } }
    );

    await resolveCustomContent(document, resolver);

    // `other` is not a value of the app, so nothing is bound for it.
    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ esqlParams: [{ service: 'cart' }] })
    );
  });

  it('tries a query that uses a list with the first value of it, or an empty one', async () => {
    const withList = (users: string[]) =>
      documentOf(
        [
          panel('board', {
            esql_query: ['FROM logs | WHERE user.name IN (?users)'],
            prompt: 'Board',
          }),
        ],
        { users: { type: 'list', default: users } }
      );

    await resolveCustomContent(withList(['alice', 'bob']), resolver);
    expect(resolver).toHaveBeenLastCalledWith(
      expect.objectContaining({ esqlParams: [{ users: 'alice' }] })
    );

    await resolveCustomContent(withList([]), resolver);
    expect(resolver).toHaveBeenLastCalledWith(
      expect.objectContaining({ esqlParams: [{ users: '' }] })
    );
  });

  it('names the panel whose template could not be written', async () => {
    resolver.mockRejectedValue(new Error('ES|QL query is invalid: Unknown column [x]'));
    const document = documentOf([panel('board', { esql_query: ['FROM x'], prompt: 'Board' })]);

    const result = await resolveCustomContent(document, resolver);

    expect(result).toEqual({
      error: expect.stringContaining('"board": ES|QL query is invalid: Unknown column [x]'),
    });
  });

  it('refuses a template with a script in it, which would never run in the frame it is shown in', async () => {
    resolver.mockResolvedValue({ template: '<script>alert(1)</script>', height: 200 });
    const document = documentOf([panel('board', { prompt: 'Board' })]);

    const result = await resolveCustomContent(document, resolver);

    expect(result).toEqual({ error: expect.stringContaining('has a script in it') });
  });

  it('refuses to write more templates in one call than it allows', async () => {
    const document = documentOf(
      Array.from({ length: MAX_TEMPLATES_PER_CALL + 1 }, (_unused, index) =>
        panel(`board-${index}`, { prompt: 'A board' })
      )
    );

    const result = await resolveCustomContent(document, resolver);

    expect(result).toEqual({ error: expect.stringContaining(`Only ${MAX_TEMPLATES_PER_CALL}`) });
    expect(resolver).not.toHaveBeenCalled();
  });
});
