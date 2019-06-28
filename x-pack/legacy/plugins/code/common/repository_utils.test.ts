/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FileTreeItemType } from '../model';
import { RepositoryUtils } from './repository_utils';

test('Repository url parsing', () => {
  // Valid git url without .git suffix.
  const repo1 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop');
  expect(repo1).toEqual({
    uri: 'github.com/apache/sqoop',
    url: 'https://github.com/apache/sqoop',
    name: 'sqoop',
    org: 'apache',
    protocol: 'https',
  });

  // Valid git url with .git suffix.
  const repo2 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop.git');
  expect(repo2).toEqual({
    uri: 'github.com/apache/sqoop',
    url: 'https://github.com/apache/sqoop.git',
    name: 'sqoop',
    protocol: 'https',
    org: 'apache',
  });

  // An invalid git url
  const repo3 = RepositoryUtils.buildRepository('github.com/apache/sqoop');
  expect(repo3).toMatchObject({
    uri: 'github.com/apache/sqoop',
    url: 'github.com/apache/sqoop',
  });

  const repo4 = RepositoryUtils.buildRepository('git://a/b');
  expect(repo4).toEqual({
    uri: 'a/_/b',
    url: 'git://a/b',
    name: 'b',
    org: '_',
    protocol: 'git',
  });

  const repo5 = RepositoryUtils.buildRepository('git://a/b/c');
  expect(repo5).toEqual({
    uri: 'a/b/c',
    url: 'git://a/b/c',
    name: 'c',
    org: 'b',
    protocol: 'git',
  });

  const repo6 = RepositoryUtils.buildRepository('git@github.com:foo/bar.git');
  expect(repo6).toEqual({
    uri: 'github.com/foo/bar',
    url: 'git@github.com:foo/bar.git',
    name: 'bar',
    protocol: 'ssh',
    org: 'foo',
  });

  const repo7 = RepositoryUtils.buildRepository('ssh://git@github.com:foo/bar.git');
  expect(repo7).toEqual({
    uri: 'github.com/foo/bar',
    url: 'ssh://git@github.com:foo/bar.git',
    name: 'bar',
    org: 'foo',
    protocol: 'ssh',
  });

  const repo8 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop/a/b');
  expect(repo8).toEqual({
    uri: 'github.com/apache_sqoop_a/b',
    url: 'https://github.com/apache/sqoop/a/b',
    name: 'b',
    org: 'apache_sqoop_a',
    protocol: 'https',
  });

  const repo9 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop/tree/master');
  expect(repo9).toEqual({
    uri: 'github.com/apache_sqoop_tree/master',
    url: 'https://github.com/apache/sqoop/tree/master',
    name: 'master',
    org: 'apache_sqoop_tree',
    protocol: 'https',
  });
});

test('Repository url parsing with non standard segments', () => {
  const repo1 = RepositoryUtils.buildRepository('git://a/b/c/d');
  expect(repo1).toEqual({
    uri: 'a/b_c/d',
    url: 'git://a/b/c/d',
    name: 'd',
    org: 'b_c',
    protocol: 'git',
  });

  const repo2 = RepositoryUtils.buildRepository('git://a/b/c/d/e');
  expect(repo2).toEqual({
    uri: 'a/b_c_d/e',
    url: 'git://a/b/c/d/e',
    name: 'e',
    org: 'b_c_d',
    protocol: 'git',
  });

  const repo3 = RepositoryUtils.buildRepository('git://a');
  expect(repo3).toEqual({
    uri: 'a/_/_',
    url: 'git://a',
    name: '_',
    protocol: 'git',
    org: '_',
  });
});

test('Repository url parsing with port', () => {
  const repo1 = RepositoryUtils.buildRepository('ssh://mine@mydomain.com:27017/gitolite-admin');
  expect(repo1).toEqual({
    uri: 'mydomain.com:27017/_/gitolite-admin',
    url: 'ssh://mine@mydomain.com:27017/gitolite-admin',
    name: 'gitolite-admin',
    org: '_',
    protocol: 'ssh',
  });

  const repo2 = RepositoryUtils.buildRepository(
    'ssh://mine@mydomain.com:27017/elastic/gitolite-admin'
  );
  expect(repo2).toEqual({
    uri: 'mydomain.com:27017/elastic/gitolite-admin',
    url: 'ssh://mine@mydomain.com:27017/elastic/gitolite-admin',
    name: 'gitolite-admin',
    protocol: 'ssh',
    org: 'elastic',
  });
});

test('Normalize repository index name', () => {
  const indexName1 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/Kibana');
  const indexName2 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/kibana');

  expect(indexName1 === indexName2).toBeFalsy();
  expect(indexName1).toEqual('github.com-elastic-kibana-e2b881a9');
  expect(indexName2).toEqual('github.com-elastic-kibana-7bf00473');

  const indexName3 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic-kibana/code');
  const indexName4 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/kibana-code');
  expect(indexName3 === indexName4).toBeFalsy();
});

test('Parse repository uri', () => {
  expect(RepositoryUtils.orgNameFromUri('github.com/elastic/kibana')).toEqual('elastic');
  expect(RepositoryUtils.repoNameFromUri('github.com/elastic/kibana')).toEqual('kibana');
  expect(RepositoryUtils.repoFullNameFromUri('github.com/elastic/kibana')).toEqual(
    'elastic/kibana'
  );

  // For invalid repository uri
  expect(() => {
    RepositoryUtils.orgNameFromUri('foo/bar');
  }).toThrowError('Invalid repository uri.');
  expect(() => {
    RepositoryUtils.repoNameFromUri('foo/bar');
  }).toThrowError('Invalid repository uri.');
  expect(() => {
    RepositoryUtils.repoFullNameFromUri('foo/bar');
  }).toThrowError('Invalid repository uri.');
});

test('Repository local path', () => {
  expect(RepositoryUtils.repositoryLocalPath('/tmp', 'github.com/elastic/kibana')).toEqual(
    '/tmp/github.com/elastic/kibana'
  );
  expect(RepositoryUtils.repositoryLocalPath('tmp', 'github.com/elastic/kibana')).toEqual(
    'tmp/github.com/elastic/kibana'
  );
});

test('Parse location to url', () => {
  expect(
    RepositoryUtils.locationToUrl({
      uri: 'git://github.com/elastic/eui/blob/master/generator-eui/app/component.js',
      range: {
        start: {
          line: 4,
          character: 17,
        },
        end: {
          line: 27,
          character: 1,
        },
      },
    })
  ).toEqual('/github.com/elastic/eui/blob/master/generator-eui/app/component.js!L5:17');
});

test('Get all files from a repository file tree', () => {
  expect(
    RepositoryUtils.getAllFiles({
      name: 'foo',
      type: FileTreeItemType.Directory,
      path: '/foo',
      children: [
        {
          name: 'bar',
          type: FileTreeItemType.File,
          path: '/foo/bar',
        },
        {
          name: 'boo',
          type: FileTreeItemType.File,
          path: '/foo/boo',
        },
      ],
      childrenCount: 2,
    })
  ).toEqual(['/foo/bar', '/foo/boo']);
});
