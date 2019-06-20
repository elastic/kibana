/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../model';
import { parseLspUrl, toCanonicalUrl, toRepoName, toRepoNameWithOrg } from './uri_util';

test('parse a complete uri', () => {
  const fullUrl =
    'git://github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts';
  const result = parseLspUrl(fullUrl);
  expect(result).toEqual({
    uri:
      '/github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
    repoUri: 'github.com/Microsoft/vscode',
    pathType: 'blob',
    revision: 'f2e49a2',
    file: 'src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
    schema: 'git:',
  });
});

test('parseLspUrl a uri without schema', () => {
  const url =
    'github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts';
  const result = parseLspUrl(url);
  expect(result).toEqual({
    uri:
      '/github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
    repoUri: 'github.com/Microsoft/vscode',
    pathType: 'blob',
    revision: 'f2e49a2',
    file: 'src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
  });
});

test('parseLspUrl a tree uri', () => {
  const uri = 'github.com/Microsoft/vscode/tree/head/src';
  const result = parseLspUrl(uri);
  expect(result).toEqual({
    uri: '/github.com/Microsoft/vscode/tree/head/src',
    repoUri: 'github.com/Microsoft/vscode',
    pathType: 'tree',
    revision: 'head',
    file: 'src',
  });
});

test('touri', () => {
  const uri =
    'git://github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts';
  const result = parseLspUrl(uri);
  expect(result).toEqual({
    uri:
      '/github.com/Microsoft/vscode/blob/f2e49a2/src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
    repoUri: 'github.com/Microsoft/vscode',
    pathType: 'blob',
    revision: 'f2e49a2',
    file: 'src/vs/base/parts/ipc/test/node/ipc.net.test.ts',
    schema: 'git:',
  });
  const convertBack = toCanonicalUrl(result!);
  expect(convertBack).toEqual(uri);
});

test('toRepoName', () => {
  const uri: RepositoryUri = 'github.com/elastic/elasticsearch';
  expect(toRepoName(uri)).toEqual('elasticsearch');

  const invalidUri: RepositoryUri = 'github.com/elastic/elasticsearch/invalid';
  expect(() => {
    toRepoName(invalidUri);
  }).toThrow();
});

test('toRepoNameWithOrg', () => {
  const uri: RepositoryUri = 'github.com/elastic/elasticsearch';
  expect(toRepoNameWithOrg(uri)).toEqual('elastic/elasticsearch');

  const invalidUri: RepositoryUri = 'github.com/elastic/elasticsearch/invalid';
  expect(() => {
    toRepoNameWithOrg(invalidUri);
  }).toThrow();
});
