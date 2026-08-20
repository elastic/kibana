/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { resolveDatasetOwnership } from './resolve_ownership';

const prospective = [
  {
    baseName: 'logs-payroll.records',
    templateName: 'logs-payroll.records',
    indexPattern: 'logs-payroll.records-*',
    priority: 200,
    isPrefix: false,
  },
];

const heldClaim = (overrides: Record<string, unknown> = {}) => ({
  id: 'logs-payroll.records',
  attributes: {
    package_name: 'mine',
    origin: 'install',
    status: 'active',
    index_patterns: ['logs-payroll.records-*'],
    ...overrides,
  },
});

const soMock = ({
  claims = [],
  installedTemplateIds = [],
}: { claims?: unknown[]; installedTemplateIds?: string[] } = {}) => {
  const soClient = savedObjectsClientMock.create();
  soClient.bulkGet.mockResolvedValue({ saved_objects: claims } as never);
  soClient.find.mockResolvedValue({
    saved_objects: [
      {
        attributes: {
          installed_es: installedTemplateIds.map((id) => ({ id, type: 'index_template' })),
        },
      },
    ],
  } as never);
  return soClient;
};

const esMock = ({
  streams = [],
  templates = [],
  settings = {},
}: { streams?: unknown[]; templates?: unknown[]; settings?: object } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getDataStream.mockResolvedValue({ data_streams: streams } as never);
  esClient.indices.getIndexTemplate.mockResolvedValue({ index_templates: templates } as never);
  esClient.indices.getSettings.mockResolvedValue(settings as never);
  return esClient;
};

const builtInLogsTemplate = {
  name: 'logs',
  index_template: { priority: 100, index_patterns: ['logs-*-*'] },
};

const ownTemplate = {
  name: 'logs-payroll.records',
  index_template: {
    priority: 200,
    index_patterns: ['logs-payroll.records-*'],
    _meta: { package: { name: 'mine' } },
  },
};

describe('resolveDatasetOwnership', () => {
  it('conflicts when the prospective template would govern a foreign stream', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-teamb', template: 'logs' }],
        templates: [builtInLogsTemplate],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.allowlist).toEqual([]);
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        kind: 'data_stream',
        name: 'logs-payroll.records-teamb',
        reason: 'would_govern',
        governingPriority: 100,
      }),
    ]);
  });

  it('warns rather than conflicts about outranking a generic built-in template', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({ templates: [builtInLogsTemplate] }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ name: 'logs', reason: 'outranks_specific_template' }),
    ]);
  });

  it('conflicts on a dataset-specific foreign template with no data stream yet', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'teamb-payroll',
            index_template: { priority: 100, index_patterns: ['logs-payroll.*-*'] },
          },
        ],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({
        kind: 'index_template',
        name: 'teamb-payroll',
        reason: 'outranks_specific_template',
      }),
    ]);
  });

  it('conflicts on a dataset-specific foreign template at higher priority', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'teamb-payroll',
            index_template: { priority: 400, index_patterns: ['logs-payroll.*-*'] },
          },
        ],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({
        kind: 'index_template',
        name: 'teamb-payroll',
        reason: 'lower_priority_specific_overlap',
      }),
    ]);
  });

  it('still allows a generic higher-priority template such as logs-*-*', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'logs',
            index_template: { priority: 400, index_patterns: ['logs-*-*'] },
          },
        ],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
  });

  it('conflicts on a foreign template with the same generated name even at higher priority', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'logs-payroll.records',
            index_template: {
              priority: 500,
              index_patterns: ['logs-payroll.records-*'],
              _meta: { package: { name: 'other' } },
            },
          },
        ],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({ kind: 'index_template', reason: 'same_template_name' }),
    ]);
  });

  it('conflicts on a same-named template that forges this package metadata but has no claim', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({ templates: [ownTemplate] }),
      soClient: soMock({ installedTemplateIds: ['logs-payroll.records'] }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({ kind: 'index_template', reason: 'same_template_name' }),
    ]);
  });

  it('treats its own template as owned once a claim exists', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({ templates: [ownTemplate] }),
      soClient: soMock({
        claims: [heldClaim()],
        installedTemplateIds: ['logs-payroll.records'],
      }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
  });

  it('treats a claimed, installed template with no _meta owner as ours', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-default', template: 'logs-payroll.records' }],
        templates: [
          {
            name: 'logs-payroll.records',
            index_template: {
              priority: 200,
              index_patterns: ['logs-payroll.records-*'],
            },
          },
        ],
      }),
      soClient: soMock({
        claims: [heldClaim()],
        installedTemplateIds: ['logs-payroll.records'],
      }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
    expect(result.allowlist).toEqual(['logs-payroll.records-default']);
  });

  it('counts a pending claim from a previous failed attempt, so a retry can resume', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-default', template: 'logs-payroll.records' }],
        templates: [ownTemplate],
      }),
      soClient: soMock({
        claims: [heldClaim({ status: 'pending', attempt_id: 'earlier-attempt' })],
        installedTemplateIds: ['logs-payroll.records'],
      }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
    expect(result.allowlist).toEqual(['logs-payroll.records-default']);
  });

  it('does not treat a template as owned on metadata and installed_es alone', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-teamb', template: 'logs-payroll.records' }],
        templates: [ownTemplate],
      }),
      soClient: soMock({ installedTemplateIds: ['logs-payroll.records'] }),
      packageName: 'mine',
      prospective,
    });

    expect(result.allowlist).toEqual([]);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('ignores a forged _meta on a template the package does not have installed', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-teamb', template: 'forged' }],
        templates: [
          {
            name: 'forged',
            index_template: {
              priority: 100,
              index_patterns: ['logs-payroll.records-*'],
              _meta: { package: { name: 'mine' } },
            },
          },
        ],
      }),
      soClient: soMock({ claims: [heldClaim()], installedTemplateIds: [] }),
      packageName: 'mine',
      prospective,
    });

    expect(result.allowlist).toEqual([]);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'data_stream',
          name: 'logs-payroll.records-teamb',
          reason: 'would_govern',
        }),
      ])
    );
  });

  it('conflicts on an equal-priority overlapping foreign template', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'someone-elses',
            index_template: { priority: 200, index_patterns: ['logs-payroll.*-*'] },
          },
        ],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({ kind: 'index_template', reason: 'equal_priority_overlap' }),
    ]);
  });

  it('evaluates a namespace descriptor against its own name, pattern and boosted priority', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        templates: [
          {
            name: 'teamb-clone',
            index_template: { priority: 225, index_patterns: ['logs-payroll.records-prod'] },
          },
        ],
      }),
      soClient: soMock({
        claims: [heldClaim()],
        installedTemplateIds: ['logs-payroll.records'],
      }),
      packageName: 'mine',
      prospective: [
        {
          baseName: 'logs-payroll.records',
          templateName: 'logs-payroll.records@namespace.prod',
          indexPattern: 'logs-payroll.records-prod',
          priority: 250,
          isPrefix: false,
        },
      ],
    });

    // Harmless against the base template at 200, a takeover at the namespace priority of 250.
    expect(result.conflicts).toEqual([
      expect.objectContaining({ name: 'teamb-clone', reason: 'outranks_specific_template' }),
    ]);
  });

  it('lets an active adoption claim authorize taking over a foreign governing template', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [
          {
            name: 'logs-payroll.records-teamb',
            template: 'logs',
            indices: [{ index_name: '.ds-x' }],
          },
        ],
        templates: [builtInLogsTemplate],
        settings: {
          '.ds-x': { settings: { index: { default_pipeline: 'logs@default-pipeline' } } },
        },
      }),
      soClient: soMock({ claims: [heldClaim({ origin: 'adoption', status: 'active' })] }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
    expect(result.allowlist).toEqual(['logs-payroll.records-teamb']);
    expect(result.adoptedStreams).toEqual([
      {
        baseName: 'logs-payroll.records',
        name: 'logs-payroll.records-teamb',
        previousDefaultPipeline: 'logs@default-pipeline',
      },
    ]);
  });

  it.each([
    ['a pending adoption claim', { origin: 'adoption', status: 'pending' }],
    ['a backfill claim', { origin: 'backfill', status: 'active' }],
    ['an install claim', { origin: 'install', status: 'active' }],
  ])('does not let %s authorize takeover', async (_label, overrides) => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-payroll.records-teamb', template: 'logs' }],
        templates: [builtInLogsTemplate],
      }),
      soClient: soMock({ claims: [heldClaim(overrides)] }),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.adoptedStreams).toEqual([]);
  });

  it('records no baseline for a stream the package already owns', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [
          {
            name: 'logs-payroll.records-default',
            template: 'logs-payroll.records',
            indices: [{ index_name: '.ds-x' }],
          },
        ],
        templates: [ownTemplate],
      }),
      soClient: soMock({
        claims: [heldClaim()],
        installedTemplateIds: ['logs-payroll.records'],
      }),
      packageName: 'mine',
      prospective,
    });

    expect(result.allowlist).toEqual(['logs-payroll.records-default']);
    expect(result.adoptedStreams).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('treats a 404 from getDataStream as no matching streams', async () => {
    const esClient = esMock({ templates: [builtInLogsTemplate] });
    esClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 404 } });

    const result = await resolveDatasetOwnership({
      esClient,
      soClient: soMock(),
      packageName: 'mine',
      prospective,
    });

    expect(result.conflicts).toEqual([]);
  });

  it('propagates a non-404 error from getDataStream', async () => {
    const esClient = esMock({ templates: [builtInLogsTemplate] });
    esClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 503 } });

    await expect(
      resolveDatasetOwnership({ esClient, soClient: soMock(), packageName: 'mine', prospective })
    ).rejects.toBeDefined();
  });

  it('reports one conflict when two descriptors match the same stream', async () => {
    const result = await resolveDatasetOwnership({
      esClient: esMock({
        streams: [{ name: 'logs-foo.bar-teamb', template: 'logs' }],
        templates: [builtInLogsTemplate],
      }),
      soClient: soMock(),
      packageName: 'mine',
      prospective: [
        {
          baseName: 'logs-foo',
          templateName: 'logs-foo',
          indexPattern: 'logs-foo.*-*',
          priority: 150,
          isPrefix: true,
        },
        {
          baseName: 'logs-foo.bar',
          templateName: 'logs-foo.bar',
          indexPattern: 'logs-foo.bar-*',
          priority: 200,
          isPrefix: false,
        },
      ],
    });

    expect(result.conflicts.filter(({ kind }) => kind === 'data_stream')).toHaveLength(1);
  });
});
