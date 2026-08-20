/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryDataStream } from '../../../../../common/types';

import {
  claimBaseNameOf,
  getClaimNamesFromInstalledEs,
  getDatasetClaimNames,
  getNamespaceProspectiveTemplates,
  getPackageProspectiveTemplates,
  getProspectiveTemplatesFromExisting,
  isDatasetSpecificPattern,
  mergeClaimNames,
} from './claim_names';

jest.mock('../namespace_template_utils', () => ({ isOtelDataStream: () => false }));

const ds = (o: Partial<RegistryDataStream> = {}): RegistryDataStream =>
  ({
    type: 'logs',
    dataset: 'payroll.records',
    title: 't',
    release: 'ga',
    package: 'p',
    path: 'p',
    ...o,
  } as RegistryDataStream);

const pkg = (dataStreams: RegistryDataStream[]): PackageInfo =>
  ({ name: 'mine', data_streams: dataStreams, policy_templates: [] } as unknown as PackageInfo);

describe('getDatasetClaimNames', () => {
  it('derives base name, pattern and priority', () => {
    expect(getDatasetClaimNames(ds())).toEqual({
      baseName: 'logs-payroll.records',
      indexPattern: 'logs-payroll.records-*',
      isPrefix: false,
      priority: 200,
    });
  });

  it('lowercases the dataset', () => {
    expect(getDatasetClaimNames(ds({ dataset: 'Payroll.Records' })).baseName).toBe(
      'logs-payroll.records'
    );
  });

  it('uses the prefix pattern and priority 150 for dataset_is_prefix', () => {
    expect(getDatasetClaimNames(ds({ dataset: 'foo', dataset_is_prefix: true }))).toEqual({
      baseName: 'logs-foo',
      indexPattern: 'logs-foo.*-*',
      isPrefix: true,
      priority: 150,
    });
  });

  it('prefixes hidden data streams with a dot', () => {
    expect(getDatasetClaimNames(ds({ hidden: true })).baseName).toBe('.logs-payroll.records');
  });

  it('appends the otel suffix when told to', () => {
    expect(getDatasetClaimNames(ds({ type: 'traces', dataset: 'generic' }), true).baseName).toBe(
      'traces-generic.otel'
    );
  });
});

describe('getPackageProspectiveTemplates', () => {
  it('uses the base name as the template name', () => {
    expect(getPackageProspectiveTemplates(pkg([ds()]))).toEqual([
      {
        baseName: 'logs-payroll.records',
        templateName: 'logs-payroll.records',
        indexPattern: 'logs-payroll.records-*',
        priority: 200,
        isPrefix: false,
      },
    ]);
  });
});

describe('getNamespaceProspectiveTemplates', () => {
  it('describes the namespace template name, exact pattern and boosted priority', () => {
    expect(getNamespaceProspectiveTemplates([ds()], pkg([]), ['prod'])).toEqual([
      {
        baseName: 'logs-payroll.records',
        templateName: 'logs-payroll.records@namespace.prod',
        indexPattern: 'logs-payroll.records-prod',
        priority: 250,
        isPrefix: false,
      },
    ]);
  });

  it('produces one descriptor per data stream and namespace', () => {
    expect(
      getNamespaceProspectiveTemplates([ds(), ds({ dataset: 'other' })], pkg([]), ['a', 'b'])
    ).toHaveLength(4);
  });
});

describe('getProspectiveTemplatesFromExisting', () => {
  it('reads the real name, pattern and priority off an already-fetched template', () => {
    expect(
      getProspectiveTemplatesFromExisting([
        {
          templateName: 'logs-payroll.records@namespace.prod',
          indexTemplate: { index_patterns: ['logs-payroll.records-prod'], priority: 250 },
        },
      ])
    ).toEqual([
      {
        baseName: 'logs-payroll.records',
        templateName: 'logs-payroll.records@namespace.prod',
        indexPattern: 'logs-payroll.records-prod',
        priority: 250,
        isPrefix: false,
      },
    ]);
  });

  it('emits one descriptor per index pattern', () => {
    expect(
      getProspectiveTemplatesFromExisting([
        {
          templateName: 'logs-foo',
          indexTemplate: { index_patterns: ['logs-foo.*-*', 'logs-foo-*'], priority: 150 },
        },
      ])
    ).toHaveLength(2);
  });
});

describe('claimBaseNameOf', () => {
  it.each([
    ['logs-payroll.records', 'logs-payroll.records'],
    ['logs-payroll.records@namespace.prod', 'logs-payroll.records'],
    ['.logs-hidden@namespace.a', '.logs-hidden'],
  ])('claimBaseNameOf(%s) is %s', (templateName, expected) => {
    expect(claimBaseNameOf(templateName)).toBe(expected);
  });
});

describe('isDatasetSpecificPattern', () => {
  it.each([
    ['logs-*-*', false],
    ['*', false],
    ['logs-*', false],
    ['.logs-*-*', false],
    ['logs-*-bar-*', false],
    ['logs-payroll.records-*', true],
    ['logs-payroll.*-*', true],
    ['logs-pay*-*', true],
    // The v3 sentinel misclassified this one as generic.
    ['logs-zzfleetownershipprobezz-*', true],
    ['*payroll.records*', true],
  ])('isDatasetSpecificPattern(%s) is %s', (pattern, expected) => {
    expect(isDatasetSpecificPattern(pattern)).toBe(expected);
  });
});

describe('getClaimNamesFromInstalledEs', () => {
  it('skips namespace templates and non-index-template refs', () => {
    expect(
      getClaimNamesFromInstalledEs([
        { id: 'logs-custom', type: 'index_template' },
        { id: 'logs-custom@namespace.prod', type: 'index_template' },
        { id: 'logs-custom-1.0.0', type: 'ingest_pipeline' },
      ])
    ).toEqual([
      {
        baseName: 'logs-custom',
        indexPattern: 'logs-custom-*',
        isPrefix: false,
        priority: 200,
      },
    ]);
  });
});

describe('mergeClaimNames', () => {
  it('keeps the primary pattern when both lists share a base name', () => {
    const primary = [
      {
        baseName: 'logs-foo',
        indexPattern: 'logs-foo.*-*',
        isPrefix: true,
        priority: 150,
      },
    ];
    const extra = [
      {
        baseName: 'logs-foo',
        indexPattern: 'logs-foo-*',
        isPrefix: false,
        priority: 200,
      },
      {
        baseName: 'logs-custom',
        indexPattern: 'logs-custom-*',
        isPrefix: false,
        priority: 200,
      },
    ];

    expect(mergeClaimNames(primary, extra)).toEqual([
      primary[0],
      {
        baseName: 'logs-custom',
        indexPattern: 'logs-custom-*',
        isPrefix: false,
        priority: 200,
      },
    ]);
  });
});
