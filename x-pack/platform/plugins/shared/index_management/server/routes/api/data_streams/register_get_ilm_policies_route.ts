/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyForFlyout, IlmPolicyPhaseForFlyout } from '@kbn/data-lifecycle-phases';
import type { IlmPhase } from '@elastic/elasticsearch/lib/api/types';
import type {
  SerializedPolicy,
  SerializedPhase,
} from '@kbn/index-lifecycle-management-common-shared';
import { isRecord } from '../../../../common/lib';
import { addBasePath } from '..';
import type { RouteDependencies } from '../../../types';

const toDurationString = (value: IlmPhase['min_age']): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const toStringDuration = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

/**
 * Converts a raw ES phase into a serialized phase. Actions are passed through verbatim (the
 * inspect flyout only reads them), so a single helper covers every phase: the base
 * `SerializedPhase` is assignable to each specific phase type in `SerializedPolicy['phases']`.
 */
const toSerializedPhase = (value: unknown): SerializedPhase | undefined => {
  if (!isRecord(value)) return undefined;
  const minAge = toStringDuration(value.min_age);
  return {
    actions: isRecord(value.actions) ? value.actions : {},
    ...(minAge ? { min_age: minAge } : {}),
  };
};

const toSerializedPolicy = (
  policyName: string,
  policyEntry: unknown
): SerializedPolicy | undefined => {
  if (!isRecord(policyEntry)) return undefined;
  const policy = policyEntry.policy;
  if (!isRecord(policy)) return undefined;

  const phases = isRecord(policy.phases) ? policy.phases : {};

  return {
    name: policyName,
    phases: {
      hot: toSerializedPhase(phases.hot),
      warm: toSerializedPhase(phases.warm),
      cold: toSerializedPhase(phases.cold),
      frozen: toSerializedPhase(phases.frozen),
      delete: toSerializedPhase(phases.delete),
    },
    deprecated: typeof policy.deprecated === 'boolean' ? policy.deprecated : undefined,
    _meta: isRecord(policy._meta) ? policy._meta : undefined,
  };
};

const toPhaseForFlyout = (phase: IlmPhase | undefined): IlmPolicyPhaseForFlyout | undefined => {
  if (!phase) return undefined;

  const fixedInterval = phase.actions?.downsample?.fixed_interval;
  const downsample =
    fixedInterval != null
      ? {
          fixed_interval: typeof fixedInterval === 'string' ? fixedInterval : String(fixedInterval),
        }
      : undefined;

  const actions =
    phase.actions?.delete || downsample
      ? {
          ...(phase.actions?.delete ? { delete: phase.actions.delete } : {}),
          ...(downsample ? { downsample } : {}),
        }
      : undefined;

  return {
    min_age: toDurationString(phase.min_age),
    actions,
  };
};

export function registerGetIlmPoliciesRoute({
  router,
  config,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/data_streams/ilm_policies'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const hasManageIlm = config.isSecurityEnabled()
          ? (await client.asCurrentUser.security.hasPrivileges({ cluster: ['manage_ilm'] }))
              .has_all_requested
          : true;

        // Only fetch policies when the user can manage ILM.
        const policiesByName = hasManageIlm ? await client.asCurrentUser.ilm.getLifecycle() : {};

        const policies: IlmPolicyForFlyout[] = Object.entries(policiesByName).map(
          ([name, policyEntry]) => {
            const phases = policyEntry.policy?.phases;

            return {
              name,
              phases: {
                hot: toPhaseForFlyout(phases?.hot),
                warm: toPhaseForFlyout(phases?.warm),
                cold: toPhaseForFlyout(phases?.cold),
                frozen: toPhaseForFlyout(phases?.frozen),
                delete: toPhaseForFlyout(phases?.delete),
              },
              serializedPolicy: toSerializedPolicy(name, policyEntry),
            };
          }
        );

        return response.ok({ body: { hasManageIlm, policies } });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
