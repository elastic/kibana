/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  AgentPolicyResponseSchema,
  FullAgentPolicyResponseSchema,
  NewAgentPolicySchema,
} from '../models';
import { inputsFormat } from '../../../common/constants';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_MAPPINGS } from '../../constants';

import { validateKuery } from '../../routes/utils/filter_utils';

import { BulkRequestBodySchema } from './common';

export const GetAgentPoliciesRequestSchema = {
  query: schema.object(
    {
      page: schema.maybe(schema.number({ defaultValue: 1 })),
      perPage: schema.maybe(schema.number({ defaultValue: 20 })),
      sortField: schema.maybe(schema.string()),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
      showUpgradeable: schema.maybe(schema.boolean()),
      kuery: schema.maybe(
        schema.string({
          validate: (value: string) => {
            const validationObj = validateKuery(
              value,
              [LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE],
              AGENT_POLICY_MAPPINGS,
              true
            );
            if (validationObj?.error) {
              return validationObj?.error;
            }
          },
        })
      ),
      noAgentCount: schema.maybe(
        schema.boolean({
          meta: { description: 'use withAgentCount instead', deprecated: true },
        })
      ),
      withAgentCount: schema.maybe(
        schema.boolean({
          meta: { description: 'get policies with agent count' },
        })
      ),
      full: schema.maybe(
        schema.boolean({
          meta: { description: 'get full policies with package policies populated' },
        })
      ),
      format: schema.maybe(
        schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
      ),
    },
    {
      validate: (query) => {
        if (
          query.perPage &&
          query.perPage > 100 &&
          (query.full || query.noAgentCount === false || query.withAgentCount === true)
        ) {
          return 'perPage should be less or equal to 100 when fetching full policies or agent count.';
        }
      },
    }
  ),
};

export const BulkGetAgentPoliciesRequestSchema = {
  body: BulkRequestBodySchema.extends({
    full: schema.maybe(
      schema.boolean({
        meta: { description: 'get full policies with package policies populated' },
      })
    ),
  }),
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const BulkGetAgentPoliciesResponseSchema = schema.object({
  items: schema.arrayOf(AgentPolicyResponseSchema),
});

export const GetOneAgentPolicyRequestSchema = {
  params: schema.object({
    agentPolicyId: schema.string(),
  }),
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const CreateAgentPolicyRequestSchema = {
  body: NewAgentPolicySchema,
  query: schema.object({
    sys_monitoring: schema.maybe(schema.boolean()),
  }),
};

export const UpdateAgentPolicyRequestSchema = {
  ...GetOneAgentPolicyRequestSchema,
  body: NewAgentPolicySchema.extends({
    force: schema.maybe(schema.boolean()),
  }),
};

export const CopyAgentPolicyRequestSchema = {
  ...GetOneAgentPolicyRequestSchema,
  body: schema.object({
    name: schema.string({ minLength: 1 }),
    description: schema.maybe(schema.string()),
  }),
};

export const DeleteAgentPolicyRequestSchema = {
  body: schema.object({
    agentPolicyId: schema.string(),
    force: schema.maybe(
      schema.boolean({
        meta: { description: 'bypass validation checks that can prevent agent policy deletion' },
      })
    ),
  }),
};

export const DeleteAgentPolicyResponseSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
});

export const GetFullAgentPolicyRequestSchema = {
  params: schema.object({
    agentPolicyId: schema.string(),
  }),
  query: schema.object({
    download: schema.maybe(schema.boolean()),
    standalone: schema.maybe(schema.boolean()),
    kubernetes: schema.maybe(schema.boolean()),
  }),
};

export const GetFullAgentPolicyResponseSchema = schema.object({
  item: schema.oneOf([schema.string(), FullAgentPolicyResponseSchema]),
});

export const DownloadFullAgentPolicyResponseSchema = schema.string();

export const GetK8sManifestRequestSchema = {
  query: schema.object({
    download: schema.maybe(schema.boolean()),
    fleetServer: schema.maybe(schema.string()),
    enrolToken: schema.maybe(schema.string()),
  }),
};

export const GetK8sManifestResponseScheme = schema.object({
  item: schema.string(),
});

export const GetAgentPolicyOutputsRequestSchema = {
  params: schema.object({
    agentPolicyId: schema.string(),
  }),
};

export const GetListAgentPolicyOutputsRequestSchema = {
  body: schema.object({
    ids: schema.arrayOf(schema.string(), {
      meta: { description: 'list of package policy ids' },
    }),
  }),
};
