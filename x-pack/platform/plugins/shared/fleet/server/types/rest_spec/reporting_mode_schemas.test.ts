/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reportStringLengthViolation } from '@kbn/schema-string-helpers';

import { CreatePackagePolicyRequestBodySchema } from '../../../common/types/models/package_policy_schema';
import { NewAgentPolicySchema } from '../models';

import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  UpdateAgentRequestSchema,
} from './agent';
import {
  CopyAgentPolicyRequestSchema,
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
} from './agent_policy';
import { GetCloudConnectorRequestSchema } from './cloud_connector';
import { FetchSavedObjectsRequestSchema } from './debug';
import { PostEnrollmentAPIKeyRequestSchema } from './enrollment_api_key';
import {
  BulkInstallPackagesFromRegistryRequestSchema,
  GetBulkAssetsRequestSchema,
  GetInfoRequestSchema,
  InstallKibanaAssetsRequestSchema,
} from './epm';
import { GetOneFleetProxyRequestSchema, PutFleetProxyRequestSchema } from './fleet_proxies';
import { PutFleetServerHostRequestSchema } from './fleet_server_policy_config';
import { GetOneOutputRequestSchema } from './output';
import { GetPackagePoliciesRequestSchema } from './package_policy';

jest.mock('@kbn/schema-string-helpers', () => ({
  ...jest.requireActual('@kbn/schema-string-helpers'),
  reportStringLengthViolation: jest.fn(),
}));

// Reporting-mode helpers default to a minimum length of 1 for IDs, types, space IDs and names.
// These fields accepted empty strings before they were converted, so every conversion passes
// `minLength: 0`; this table guards that compatibility rule across a sample of each helper.
describe('reporting mode string fields still accept empty strings', () => {
  const cases: Array<[string, () => unknown]> = [
    ['path param agentId', () => GetOneAgentRequestSchema.params.validate({ agentId: '' })],
    [
      'path param agentPolicyId',
      () => GetOneAgentPolicyRequestSchema.params.validate({ agentPolicyId: '' }),
    ],
    [
      'body policy_id',
      () => PostEnrollmentAPIKeyRequestSchema.body.validate({ policy_id: '', name: '' }),
    ],
    [
      'bulk reassign policy_id',
      () => PostBulkAgentReassignRequestSchema.body.validate({ agents: ['a'], policy_id: '' }),
    ],
    ['agent tag', () => UpdateAgentRequestSchema.body.validate({ tags: [''] })],
    [
      'bulk agent tags',
      () =>
        PostBulkUpdateAgentTagsRequestSchema.body.validate({
          agents: ['a'],
          tagsToAdd: [''],
          tagsToRemove: [''],
        }),
    ],
    ['pkgName', () => GetInfoRequestSchema.params.validate({ pkgName: '', pkgVersion: '1.0.0' })],
    [
      'bulk install package name',
      () =>
        BulkInstallPackagesFromRegistryRequestSchema.body.validate({
          packages: ['', { name: '', version: '1.0.0' }],
        }),
    ],
    ['space ID', () => InstallKibanaAssetsRequestSchema.body.validate({ space_ids: [''] })],
    [
      'saved object ID and type',
      () => GetBulkAssetsRequestSchema.body.validate({ assetIds: [{ id: '', type: '' }] }),
    ],
    [
      'Fleet Server host name and proxy_id',
      () => PutFleetServerHostRequestSchema.body.validate({ name: '', proxy_id: '' }),
    ],
    ['proxy name', () => PutFleetProxyRequestSchema.body.validate({ name: '' })],
    [
      'debug saved object type and name',
      () => FetchSavedObjectsRequestSchema.body.validate({ type: '', name: '' }),
    ],
    [
      'agent policy IDs',
      () =>
        NewAgentPolicySchema.validate({
          name: 'policy',
          namespace: 'default',
          id: '',
          data_output_id: '',
          space_ids: [''],
          global_data_tags: [{ name: '', value: 'value' }],
        }),
    ],
    [
      'package policy name and IDs',
      () =>
        CreatePackagePolicyRequestBodySchema.validate({
          name: '',
          inputs: [],
          id: '',
          policy_ids: [''],
          output_id: '',
        }),
    ],
  ];

  it.each(cases)('%s', (_name, validate) => {
    expect(validate).not.toThrow();
  });
});

// The histogram is grouped by these hand-written labels, so a mislabelled or mis-wired field would
// silently skew the data. This table checks one overlong value per helper and schema family.
describe('reporting mode string fields report violations under their label', () => {
  const overlong = (length: number) => 'a'.repeat(length);
  const kqlOfLength = (length: number) => `status:${'a'.repeat(length - 'status:'.length)}`;
  const streamInputs = (streamId: string) => [
    {
      type: 'logfile',
      enabled: true,
      streams: [
        { id: streamId, enabled: true, data_stream: { type: 'logs', dataset: 'system.syslog' } },
      ],
    },
  ];

  const cases: Array<[string, () => unknown, { helper: string; maxLength: number }]> = [
    [
      'fleet.agents.get_one_agent.agentId',
      () => GetOneAgentRequestSchema.params.validate({ agentId: overlong(513) }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
    [
      'fleet.agents.update_agent.tags',
      () => UpdateAgentRequestSchema.body.validate({ tags: [overlong(256)] }),
      { helper: 'displayName', maxLength: 255 },
    ],
    [
      'fleet.agents.kuery',
      () => GetAgentsRequestSchema.query.validate({ kuery: kqlOfLength(10_001) }),
      { helper: 'searchFilter', maxLength: 10_000 },
    ],
    [
      'fleet.agent_policies.sortField',
      () => GetAgentPoliciesRequestSchema.query.validate({ sortField: overlong(257) }),
      { helper: 'querySortField', maxLength: 256 },
    ],
    [
      'fleet.agent_policies.copy.description',
      () =>
        CopyAgentPolicyRequestSchema.body.validate({
          name: 'policy',
          description: overlong(10_001),
        }),
      { helper: 'description', maxLength: 10_000 },
    ],
    [
      'fleet.agent_policies.name',
      () => NewAgentPolicySchema.validate({ name: overlong(256), namespace: 'default' }),
      { helper: 'displayName', maxLength: 255 },
    ],
    [
      'fleet.agent_policies.space_ids',
      () =>
        NewAgentPolicySchema.validate({
          name: 'policy',
          namespace: 'default',
          space_ids: [overlong(513)],
        }),
      { helper: 'spaceId', maxLength: 512 },
    ],
    [
      'fleet.package_policies.name',
      () => CreatePackagePolicyRequestBodySchema.validate({ name: overlong(256), inputs: [] }),
      { helper: 'displayName', maxLength: 255 },
    ],
    [
      'fleet.package_policies.inputs.streams.id',
      () =>
        CreatePackagePolicyRequestBodySchema.validate({
          name: 'policy',
          inputs: streamInputs(overlong(513)),
        }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
    [
      'fleet.package_policies.sortField',
      () => GetPackagePoliciesRequestSchema.query.validate({ sortField: overlong(257) }),
      { helper: 'querySortField', maxLength: 256 },
    ],
    [
      'fleet.epm.pkgName',
      () => GetInfoRequestSchema.params.validate({ pkgName: overlong(513), pkgVersion: '1.0.0' }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
    [
      'fleet.epm.bulk_assets.type',
      () =>
        GetBulkAssetsRequestSchema.body.validate({ assetIds: [{ id: 'id', type: overlong(257) }] }),
      { helper: 'savedObjectType', maxLength: 256 },
    ],
    [
      'fleet.outputs.get.outputId',
      () => GetOneOutputRequestSchema.params.validate({ outputId: overlong(513) }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
    [
      'fleet.fleet_server_hosts.name',
      () => PutFleetServerHostRequestSchema.body.validate({ name: overlong(256) }),
      { helper: 'displayName', maxLength: 255 },
    ],
    [
      'fleet.proxies.get.itemId',
      () => GetOneFleetProxyRequestSchema.params.validate({ itemId: overlong(513) }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
    [
      'fleet.enrollment_api_keys.create.name',
      () =>
        PostEnrollmentAPIKeyRequestSchema.body.validate({
          policy_id: 'policy',
          name: overlong(256),
        }),
      { helper: 'displayName', maxLength: 255 },
    ],
    [
      'fleet.cloud_connectors.get.cloudConnectorId',
      () => GetCloudConnectorRequestSchema.params.validate({ cloudConnectorId: overlong(513) }),
      { helper: 'savedObjectId', maxLength: 512 },
    ],
  ];

  beforeEach(() => {
    jest.mocked(reportStringLengthViolation).mockClear();
  });

  it.each(cases)('%s', (label, validate, { helper, maxLength }) => {
    expect(validate).not.toThrow();
    expect(reportStringLengthViolation).toHaveBeenCalledWith({
      helper,
      library: 'config-schema',
      maxLength,
      length: expect.any(Number),
      label,
    });
  });

  it('does not report values within the threshold', () => {
    GetOneAgentRequestSchema.params.validate({ agentId: overlong(512) });
    UpdateAgentRequestSchema.body.validate({ tags: [overlong(255)] });
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });
});
