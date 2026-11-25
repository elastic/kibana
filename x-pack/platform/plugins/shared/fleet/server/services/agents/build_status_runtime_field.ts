/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { AGENT_POLLING_THRESHOLD_MS } from '../../constants';
import { agentPolicyService } from '../agent_policy';

const MISSED_INTERVALS_BEFORE_OFFLINE = 12;
const MS_BEFORE_OFFLINE = MISSED_INTERVALS_BEFORE_OFFLINE * AGENT_POLLING_THRESHOLD_MS;
export type InactivityTimeouts = Awaited<
  ReturnType<(typeof agentPolicyService)['getInactivityTimeouts']>
>;

type StatusRuntimeMapping = NonNullable<estypes.MappingRuntimeFields> & {
  status: {
    type: 'keyword';
    script: {
      lang: 'painless';
      source: string;
      params: {
        // base policy id -> epoch millis; agents on that policy whose last check-in is older are inactive
        inactivityCutoffs: Record<string, number>;
        // epoch millis; agents whose last check-in is older are offline
        offlineCutoff: number;
      };
    };
  };
};

// Painless equivalent of `buildPolicyBaseIdWithFallbackEsFilter`: `getInactivityTimeouts()` only ever
// returns base policy ids, so an agent moved to a version-specific variant (`<id>#sentinel`) has to be
// matched on `policy_base_id`, falling back to `policy_id` for documents that pre-date that field.
const _buildPolicyBaseIdDeclaration = (opts: {
  field: (path: string) => string;
  fieldPath: (path: string) => string;
}): string => {
  const { field, fieldPath } = opts;

  return `String agentPolicyBaseId = doc.containsKey(${fieldPath('policy_base_id')}) && ${field(
    'policy_base_id'
  )}.size() > 0
      ? ${field('policy_base_id')}.value
      : (
          doc.containsKey(${fieldPath('policy_id')}) && ${field('policy_id')}.size() > 0
          ? ${field('policy_id')}.value
          : ''
        );`;
};

// The source must not depend on the inactivity timeouts or on the current time: policies and cutoffs
// are passed as script params so the source stays well below `script.max_size_in_bytes` whatever the
// number of policies is (see github.com/elastic/kibana/issues/150577) and Elasticsearch can cache
// the compiled script.
function _buildSource(pathPrefix?: string) {
  const normalizedPrefix = pathPrefix ? `${pathPrefix}${pathPrefix.endsWith('.') ? '' : '.'}` : '';
  const field = (path: string) => `doc['${normalizedPrefix + path}']`;
  const fieldPath = (path: string) => `'${normalizedPrefix + path}'`;

  return `
    long lastCheckinMillis = doc.containsKey(${fieldPath('last_checkin')}) && ${field(
    'last_checkin'
  )}.size() > 0
      ? ${field('last_checkin')}.value.toInstant().toEpochMilli()
      : (
          ${field('enrolled_at')}.size() > 0
          ? ${field('enrolled_at')}.value.toInstant().toEpochMilli()
          : -1
        );
    ${_buildPolicyBaseIdDeclaration({ field, fieldPath })}
    def inactivityCutoff = agentPolicyBaseId.length() > 0 ? params.inactivityCutoffs.get(agentPolicyBaseId) : null;
    if (!doc.containsKey(${fieldPath('active')}) || (${field('active')}.size() > 0 && ${field(
    'active'
  )}.value == false)) {
      emit('unenrolled');
    }
    else if (inactivityCutoff != null && lastCheckinMillis > 0 && lastCheckinMillis < ((Number) inactivityCutoff).longValue()) {emit('inactive');}
    else if (doc.containsKey('audit_unenrolled_reason') && ${field(
      'audit_unenrolled_reason'
    )}.size() > 0 && ${field('audit_unenrolled_reason')}.value == 'uninstall'){emit('uninstalled');}
    else if (doc.containsKey('audit_unenrolled_reason') && ${field(
      'audit_unenrolled_reason'
    )}.size() > 0 && ${field('audit_unenrolled_reason')}.value == 'orphaned'){emit('orphaned');}
    else if (
        lastCheckinMillis > 0
        && lastCheckinMillis < params.offlineCutoff
    ) {
      emit('offline');
    } else if (
      ${field('last_checkin_status')}.size() > 0 &&
      ${field('last_checkin_status')}.value.toLowerCase() == 'disconnected'
    ) {
      emit('offline');
    } else if (
      ${field('policy_revision_idx')}.size() == 0 || (
        ${field('upgrade_started_at')}.size() > 0 &&
        ${field('upgraded_at')}.size() == 0
      )
    ) {
      emit('updating');
    } else if (${field('last_checkin')}.size() == 0) {
      emit('enrolling');
    } else if (${field('unenrollment_started_at')}.size() > 0) {
      emit('unenrolling');
    } else if (
      ${field('last_checkin_status')}.size() > 0 &&
      ${field('last_checkin_status')}.value.toLowerCase() == 'error'
    ) {
        emit('error');
    } else if (
      ${field('last_checkin_status')}.size() > 0 &&
      ${field('last_checkin_status')}.value.toLowerCase() == 'degraded'
    ) {
      emit('degraded');
    } else {
      emit('online');
    }`.replace(/\s{2,}/g, ' '); // replace newlines and double spaces to save characters
}

const sourceCache = new Map<string, string>();
const getSource = (pathPrefix?: string) => {
  const key = pathPrefix ?? '';
  let source = sourceCache.get(key);
  if (source === undefined) {
    source = _buildSource(pathPrefix);
    sourceCache.set(key, source);
  }
  return source;
};

// exported for testing
export function _buildStatusRuntimeField(opts: {
  inactivityTimeouts: InactivityTimeouts;
  pathPrefix?: string;
}): StatusRuntimeMapping {
  const { inactivityTimeouts, pathPrefix } = opts;
  const now = Date.now();

  const inactivityCutoffs: Record<string, number> = {};
  for (const { inactivityTimeout, policyIds } of inactivityTimeouts) {
    const cutoff = now - inactivityTimeout * 1000;
    for (const policyId of policyIds) {
      // a policy should only be in one group, if not the shortest timeout (largest cutoff) wins
      inactivityCutoffs[policyId] = Math.max(inactivityCutoffs[policyId] ?? -Infinity, cutoff);
    }
  }

  return {
    status: {
      type: 'keyword',
      script: {
        lang: 'painless',
        source: getSource(pathPrefix),
        params: {
          inactivityCutoffs,
          offlineCutoff: now - MS_BEFORE_OFFLINE,
        },
      },
    },
  };
}

// Build the runtime field to return the agent status
// pathPrefix is used to prefix the field path in the source
// pathPrefix is used by the endpoint team currently to run
// agent queries against the endpoint metadata index
export async function buildAgentStatusRuntimeField(
  soClient?: SavedObjectsClientContract, // Deprecated, it's now using an internal client
  pathPrefix?: string
) {
  const inactivityTimeouts = await agentPolicyService.getInactivityTimeouts();

  return _buildStatusRuntimeField({
    inactivityTimeouts,
    pathPrefix,
  });
}
