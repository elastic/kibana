/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../types';

import { getAssetsFromAssetsMap } from './assets';

test('test getAssetsFromAssetsMap integration pkg', () => {
  const tests = [
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      dataset: 'log',
      filter: (path: string) => {
        return true;
      },
      expected: [
        'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
        'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      ],
    },
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      // Non existent dataset
      dataset: 'foo',
      filter: (path: string) => {
        return true;
      },
      expected: [],
    },
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      // Filter which does not exist
      filter: (path: string) => {
        return path.includes('foo');
      },
      expected: [],
    },
  ];

  const assetsMap = new Map([
    [
      'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
      Buffer.from('{}'),
    ],
    [
      'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      Buffer.from('{}'),
    ],
  ]);

  for (const value of tests) {
    // as needed to pretend it is an InstallablePackage
    const assets = getAssetsFromAssetsMap(
      value.package as PackageInfo,
      assetsMap,
      value.filter,
      value.dataset
    );
    expect(assets).toStrictEqual(value.expected);
  }
});

test('testGetAssets input pkg', () => {
  const assetsMap = new Map(
    [
      'input_package_upgrade-1.0.0/agent/input/input.yml.hbs',
      'input_package_upgrade-1.0.0/changelog.yml',
      'input_package_upgrade-1.0.0/docs/README.md',
      'input_package_upgrade-1.0.0/fields/input.yml',
      'input_package_upgrade-1.0.0/img/sample-logo.svg',
      'input_package_upgrade-1.0.0/img/sample-screenshot.png',
      'input_package_upgrade-1.0.0/manifest.yml',
    ].map((path) => [path, Buffer.from('{}')])
  );

  const tests = [
    {
      package: {
        name: 'input_package_upgrade',
        version: '1.0.0',
        type: 'input',
      },
      dataset: 'log',
      filter: (path: string) => {
        return true;
      },
      expected: [
        'input_package_upgrade-1.0.0/agent/input/input.yml.hbs',
        'input_package_upgrade-1.0.0/fields/input.yml',
      ],
    },
  ];

  for (const value of tests) {
    // as needed to pretend it is an InstallablePackage
    const assets = getAssetsFromAssetsMap(
      value.package as PackageInfo,
      assetsMap,
      value.filter,
      value.dataset
    );
    expect(assets).toStrictEqual(value.expected);
  }
});
