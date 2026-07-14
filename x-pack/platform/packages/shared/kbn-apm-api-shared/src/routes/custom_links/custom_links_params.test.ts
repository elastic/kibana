/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { createCustomLinkRoute } from './create_custom_link';
import { updateCustomLinkRoute } from './update_custom_link';
import { deleteCustomLinkRoute } from './delete_custom_link';
import { listCustomLinksRoute } from './list_custom_links';
import { customLinkTransactionRoute } from './custom_link_transaction';

describe('createCustomLinkRoute params', () => {
  it('accepts a minimal label/url body', () => {
    expectParseSuccess(
      createCustomLinkRoute.params!.safeParse({ body: { label: 'l', url: 'http://x' } })
    );
  });

  it('accepts optional id + filters', () => {
    expectParseSuccess(
      createCustomLinkRoute.params!.safeParse({
        body: {
          label: 'l',
          url: 'http://x',
          id: 'abc',
          filters: [{ key: 'service.name', value: 'opbeans-java' }],
        },
      })
    );
  });

  it('rejects a missing label', () => {
    expectParseError(createCustomLinkRoute.params!.safeParse({ body: { url: 'http://x' } }));
  });

  it('rejects an unknown filter key', () => {
    expectParseError(
      createCustomLinkRoute.params!.safeParse({
        body: { label: 'l', url: 'http://x', filters: [{ key: 'not.a.key', value: 'v' }] },
      })
    );
  });
});

describe('updateCustomLinkRoute params', () => {
  it('accepts path id + body', () => {
    expectParseSuccess(
      updateCustomLinkRoute.params!.safeParse({
        path: { id: 'abc' },
        body: { label: 'l', url: 'http://x' },
      })
    );
  });

  it('rejects a missing path id', () => {
    expectParseError(
      updateCustomLinkRoute.params!.safeParse({ body: { label: 'l', url: 'http://x' } })
    );
  });
});

describe('deleteCustomLinkRoute params', () => {
  it('accepts a path id', () => {
    expectParseSuccess(deleteCustomLinkRoute.params!.safeParse({ path: { id: 'abc' } }));
  });
});

describe('listCustomLinksRoute / customLinkTransactionRoute params', () => {
  it('allow an omitted query', () => {
    expectParseSuccess(listCustomLinksRoute.params!.safeParse({}));
    expectParseSuccess(customLinkTransactionRoute.params!.safeParse({}));
  });

  it('accept partial filter options', () => {
    expectParseSuccess(
      listCustomLinksRoute.params!.safeParse({ query: { 'service.name': 'opbeans-java' } })
    );
    expectParseSuccess(
      customLinkTransactionRoute.params!.safeParse({ query: { 'transaction.type': 'request' } })
    );
  });
});
