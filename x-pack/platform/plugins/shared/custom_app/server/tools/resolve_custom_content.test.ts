/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentShapeSchema } from '@kbn/custom-app-common';
import { MAX_TEMPLATES_PER_CALL, resolveCustomContent } from './resolve_custom_content';

const resolver = jest.fn();

const documentOf = (children: unknown[], state: Record<string, unknown> = {}) =>
  appDocumentShapeSchema.parse({ state, root: { type: 'stack', id: 'root', children } });

const childrenOf = (result: Awaited<ReturnType<typeof resolveCustomContent>>) => {
  if ('error' in result) throw new Error(result.error);
  return (result.document.root as { children: unknown[] }).children;
};

describe('resolveCustomContent', () => {
  beforeEach(() => {
    resolver.mockReset().mockResolvedValue({ template: '<p>written</p>', height: 360 });
  });

  it('writes the template of a component that has a prompt, and drops the prompt', async () => {
    const document = documentOf([
      { type: 'custom_content', id: 'board', query: 'FROM status', prompt: 'A status board' },
    ]);

    const [node] = childrenOf(await resolveCustomContent(document, resolver));

    expect(node).toEqual({
      type: 'custom_content',
      id: 'board',
      query: 'FROM status',
      template: '<p>written</p>',
      height: 360,
    });
    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'A status board', esqlQuery: 'FROM status' })
    );
  });

  it('refines the template a component already has, instead of starting again', async () => {
    const document = documentOf([
      { type: 'custom_content', id: 'board', template: '<b>old</b>', prompt: 'Make it blue' },
    ]);

    await resolveCustomContent(document, resolver);

    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ existingTemplate: '<b>old</b>', esqlQuery: undefined })
    );
  });

  it('leaves a component with no prompt as it is, and asks nobody anything', async () => {
    const document = documentOf([
      { type: 'custom_content', id: 'board', template: '<b>keep</b>' },
      { type: 'heading', id: 'title', text: 'Hi' },
    ]);

    const result = await resolveCustomContent(document, resolver);

    expect(resolver).not.toHaveBeenCalled();
    expect(childrenOf(result)).toEqual(
      document.root && (document.root as { children: unknown[] }).children
    );
  });

  it('finds components inside others, such as a flyout', async () => {
    const document = documentOf([
      {
        type: 'flyout',
        id: 'detail',
        title: 'Detail',
        children: [{ type: 'custom_content', id: 'inner', prompt: 'A note' }],
      },
    ]);

    const [flyout] = childrenOf(await resolveCustomContent(document, resolver));

    expect((flyout as { children: unknown[] }).children).toEqual([
      expect.objectContaining({ id: 'inner', template: '<p>written</p>' }),
    ]);
  });

  it('tries a query that has parameters with the defaults of the values it uses', async () => {
    const document = documentOf(
      [
        {
          type: 'custom_content',
          id: 'board',
          query: 'FROM logs | WHERE service == ?service AND x == ?other',
          prompt: 'Board',
        },
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
          {
            type: 'custom_content',
            id: 'board',
            query: 'FROM logs | WHERE user.name IN (?users)',
            prompt: 'Board',
          },
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

  it('names the component whose template could not be written', async () => {
    resolver.mockRejectedValue(new Error('ES|QL query is invalid: Unknown column [x]'));
    const document = documentOf([
      { type: 'custom_content', id: 'board', query: 'FROM x', prompt: 'Board' },
    ]);

    const result = await resolveCustomContent(document, resolver);

    expect(result).toEqual({
      error: expect.stringContaining('"board": ES|QL query is invalid: Unknown column [x]'),
    });
  });

  it('refuses to write more templates in one call than it allows', async () => {
    const document = documentOf(
      Array.from({ length: MAX_TEMPLATES_PER_CALL + 1 }, (_unused, index) => ({
        type: 'custom_content',
        id: `board-${index}`,
        prompt: 'A board',
      }))
    );

    const result = await resolveCustomContent(document, resolver);

    expect(result).toEqual({ error: expect.stringContaining(`Only ${MAX_TEMPLATES_PER_CALL}`) });
    expect(resolver).not.toHaveBeenCalled();
  });

  it('writes the template of a component inside any container, such as the tab of a page', async () => {
    const document = appDocumentShapeSchema.parse({
      state: {},
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'tabs',
            id: 'tabs',
            children: [
              {
                type: 'section',
                id: 'board-tab',
                label: 'Board',
                children: [
                  {
                    type: 'card',
                    id: 'card',
                    children: [
                      { type: 'custom_content', id: 'board', query: 'FROM s', prompt: 'A board' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await resolveCustomContent(document, resolver);

    if ('error' in result) throw new Error(result.error);
    expect(JSON.stringify(result.document.root)).toContain('<p>written</p>');
    expect(JSON.stringify(result.document.root)).not.toContain('"prompt"');
  });
});
