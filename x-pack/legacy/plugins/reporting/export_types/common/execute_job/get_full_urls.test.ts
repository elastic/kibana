/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../../../test_helpers/create_mock_server';
import { JobDocPayloadPNG } from '../../png/types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';
import { getFullUrls } from './get_full_urls';

let mockServer: any;
beforeEach(() => {
  mockServer = createMockServer('');
});

test(`fails if no URL is passed`, async () => {
  await expect(
    getFullUrls({
      job: {} as JobDocPayloadPNG,
      server: mockServer,
    })
  ).rejects.toMatchInlineSnapshot(
    `[Error: No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\`]`
  );
});

test(`fails if URL does not route to a visualization`, async () => {
  await expect(
    getFullUrls({
      job: {
        relativeUrl: '/app/phoney',
      } as JobDocPayloadPNG,
      server: mockServer,
    })
  ).rejects.toMatchInlineSnapshot(
    `[Error: No valid hash in the URL! A hash is expected for the application to route to the intended visualization.]`
  );
});

test(`adds forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const { urls } = await getFullUrls({
    job: {
      relativeUrl: '/app/kibana#/something',
      forceNow,
    } as JobDocPayloadPNG,
    server: mockServer,
  });

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`appends forceNow to hash's query, if it exists`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';

  const { urls } = await getFullUrls({
    job: {
      relativeUrl: '/app/kibana#/something?_g=something',
      forceNow,
    } as JobDocPayloadPNG,
    server: mockServer,
  });

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const { urls } = await getFullUrls({
    job: {
      relativeUrl: '/app/kibana#/something',
    } as JobDocPayloadPNG,
    server: mockServer,
  });

  expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');
});

test(`adds forceNow to each of multiple urls`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const { urls } = await getFullUrls({
    job: {
      objects: [
        { relativeUrl: '/app/kibana#/something_aaa' },
        { relativeUrl: '/app/kibana#/something_bbb' },
        { relativeUrl: '/app/kibana#/something_ccc' },
        { relativeUrl: '/app/kibana#/something_ddd' },
      ],
      forceNow,
    } as JobDocPayloadPDF,
    server: mockServer,
  });

  expect(urls).toEqual([
    'http://localhost:5601/sbp/app/kibana#/something_aaa?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_bbb?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ccc?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ddd?forceNow=2000-01-01T00%3A00%3A00.000Z',
  ]);
});
