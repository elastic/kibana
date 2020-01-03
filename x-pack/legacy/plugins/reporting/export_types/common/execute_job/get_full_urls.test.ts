/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../../../test_helpers/create_mock_server';
import { ServerFacade } from '../../../types';
import { JobDocPayloadPNG } from '../../png/types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';
import { getFullUrls } from './get_full_urls';

interface FullUrlsOpts {
  job: JobDocPayloadPNG & JobDocPayloadPDF;
  server: ServerFacade;
  conditionalHeaders: any;
}

let mockServer: any;
beforeEach(() => {
  mockServer = createMockServer('');
});

test(`fails if no URL is passed`, async () => {
  await expect(
    getFullUrls({
      job: {},
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: No valid URL fields found in Job Params! Expected \`job.relativeUrl: string\` or \`job.relativeUrls: string[]\`]`
  );
});

test(`fails if URLs are file-protocols for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  await expect(
    getFullUrls({
      job: {
        relativeUrl,
        forceNow,
      },
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Found invalid URL(s), all URLs must be relative: ${relativeUrl}]`
  );
});

test(`fails if URLs are absolute for PNGs`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  await expect(
    getFullUrls({
      job: {
        relativeUrl,
        forceNow,
      },
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Found invalid URL(s), all URLs must be relative: ${relativeUrl}]`
  );
});

test(`fails if URLs are file-protocols for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl = 'file://etc/passwd/#/something';
  await expect(
    getFullUrls({
      job: {
        relativeUrls: [relativeUrl],
        forceNow,
      },
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Found invalid URL(s), all URLs must be relative: ${relativeUrl}]`
  );
});

test(`fails if URLs are absolute for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrl =
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something';
  await expect(
    getFullUrls({
      job: {
        relativeUrls: [relativeUrl],
        forceNow,
      },
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Found invalid URL(s), all URLs must be relative: ${relativeUrl}]`
  );
});

test(`fails if any URLs are absolute or file's for PDF`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const relativeUrls = [
    '/app/kibana#/something_aaa',
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName/#/something',
    'file://etc/passwd/#/something',
  ];
  await expect(
    getFullUrls({
      job: {
        relativeUrls,
        forceNow,
      },
      server: mockServer,
    } as FullUrlsOpts)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Found invalid URL(s), all URLs must be relative: ${relativeUrls[1]} ${relativeUrls[2]}]`
  );
});

test(`fails if URL does not route to a visualization`, async () => {
  await expect(
    getFullUrls({
      job: {
        relativeUrl: '/app/phoney',
      },
      server: mockServer,
    } as FullUrlsOpts)
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
    },
    server: mockServer,
  } as FullUrlsOpts);

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
    },
    server: mockServer,
  } as FullUrlsOpts);

  expect(urls[0]).toEqual(
    'http://localhost:5601/sbp/app/kibana#/something?_g=something&forceNow=2000-01-01T00%3A00%3A00.000Z'
  );
});

test(`doesn't append forceNow query to url, if it doesn't exists`, async () => {
  const { urls } = await getFullUrls({
    job: {
      relativeUrl: '/app/kibana#/something',
    },
    server: mockServer,
  } as FullUrlsOpts);

  expect(urls[0]).toEqual('http://localhost:5601/sbp/app/kibana#/something');
});

test(`adds forceNow to each of multiple urls`, async () => {
  const forceNow = '2000-01-01T00:00:00.000Z';
  const { urls } = await getFullUrls({
    job: {
      relativeUrls: [
        '/app/kibana#/something_aaa',
        '/app/kibana#/something_bbb',
        '/app/kibana#/something_ccc',
        '/app/kibana#/something_ddd',
      ],
      forceNow,
    },
    server: mockServer,
  } as FullUrlsOpts);

  expect(urls).toEqual([
    'http://localhost:5601/sbp/app/kibana#/something_aaa?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_bbb?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ccc?forceNow=2000-01-01T00%3A00%3A00.000Z',
    'http://localhost:5601/sbp/app/kibana#/something_ddd?forceNow=2000-01-01T00%3A00%3A00.000Z',
  ]);
});
