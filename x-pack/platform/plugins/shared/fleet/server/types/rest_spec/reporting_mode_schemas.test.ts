/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreatePackagePolicyRequestBodySchema } from '../../../common/types/models/package_policy_schema';
import { NewAgentPolicySchema } from '../models';

import {
  GetOneAgentRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  UpdateAgentRequestSchema,
} from './agent';
import { GetOneAgentPolicyRequestSchema } from './agent_policy';
import { FetchSavedObjectsRequestSchema } from './debug';
import { PostEnrollmentAPIKeyRequestSchema } from './enrollment_api_key';
import {
  BulkInstallPackagesFromRegistryRequestSchema,
  GetBulkAssetsRequestSchema,
  GetInfoRequestSchema,
  InstallKibanaAssetsRequestSchema,
} from './epm';
import { PutFleetProxyRequestSchema } from './fleet_proxies';
import { PutFleetServerHostRequestSchema } from './fleet_server_policy_config';

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
