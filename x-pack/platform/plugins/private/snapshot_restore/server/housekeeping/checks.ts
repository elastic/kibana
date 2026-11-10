/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import type { HousekeepingCheck } from '@kbn/housekeeping-plugin/server';
import { getSlmPolicies, isManagedPolicy } from './resource_provider';

/** Longer than this without a successful snapshot, the backups of the cluster are stale. */
export const MAX_DAYS_WITHOUT_SNAPSHOT = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ERROR_LENGTH = 300;

const DEFAULT_RETENTION = { expire_after: '30d', min_count: 5, max_count: 50 };

const toMillis = (time?: estypes.DateTime) =>
  time === undefined ? undefined : typeof time === 'number' ? time : new Date(time).getTime();

const daysSince = (millis: number) => Math.floor((Date.now() - millis) / DAY_MS);

const isFailing = ({
  last_failure: lastFailure,
  last_success: lastSuccess,
}: estypes.SlmSnapshotLifecycle) =>
  lastFailure !== undefined &&
  (toMillis(lastFailure.time) ?? 0) > (toMillis(lastSuccess?.time) ?? 0);

/** Elasticsearch returns the error of a failed run in `details`, which its types leave out. */
const getFailureDetails = (failure: estypes.SlmInvocation) =>
  'details' in failure && typeof failure.details === 'string' ? failure.details : '';

/** The failure details are an Elasticsearch error serialized as JSON. */
const getErrorReason = (details: string) => {
  try {
    const { reason } = JSON.parse(details) as { reason?: string };
    return (reason ?? details).slice(0, MAX_ERROR_LENGTH);
  } catch {
    return details.slice(0, MAX_ERROR_LENGTH);
  }
};

const toResource = (name: string) => ({
  type: 'slm_policy',
  id: name,
  isManaged: isManagedPolicy(name),
});

const notInServerless: HousekeepingCheck['isAvailable'] = ({ isServerless }) => !isServerless;

export const failingPolicyCheck: HousekeepingCheck = {
  id: 'snapshot_restore.failing_policy',
  title: i18n.translate('xpack.snapshotRestore.housekeeping.failingPolicy.title', {
    defaultMessage: 'Snapshot policies that fail',
  }),
  description: i18n.translate('xpack.snapshotRestore.housekeeping.failingPolicy.description', {
    defaultMessage:
      'The last run of these policies failed, so the cluster may have no recent backup.',
  }),
  resourceTypes: ['slm_policy'],
  isAvailable: notInServerless,
  async run(context) {
    const policies = await getSlmPolicies(context);
    return Object.entries(policies).flatMap(([name, lifecycle]) => {
      if (!isFailing(lifecycle) || !lifecycle.last_failure) {
        return [];
      }
      const { time } = lifecycle.last_failure;
      const details = getFailureDetails(lifecycle.last_failure);
      return [
        {
          resource: toResource(name),
          related: [],
          details: [
            i18n.translate('xpack.snapshotRestore.housekeeping.failingPolicy.lastFailure', {
              defaultMessage:
                'The last run failed {days, plural, =0 {today} one {# day ago} other {# days ago}}: {reason}',
              values: {
                days: daysSince(toMillis(time) ?? Date.now()),
                reason: getErrorReason(details),
              },
            }),
          ],
          evidence: { lastFailure: lifecycle.last_failure, lastSuccess: lifecycle.last_success },
        },
      ];
    });
  },
};

export const staleSnapshotsCheck: HousekeepingCheck = {
  id: 'snapshot_restore.no_recent_snapshot',
  title: i18n.translate('xpack.snapshotRestore.housekeeping.noRecentSnapshot.title', {
    defaultMessage: 'Snapshot policies without a recent snapshot',
  }),
  description: i18n.translate('xpack.snapshotRestore.housekeeping.noRecentSnapshot.description', {
    defaultMessage:
      'These policies took no successful snapshot in the last {days} days, so a restore would lose more recent data.',
    values: { days: MAX_DAYS_WITHOUT_SNAPSHOT },
  }),
  resourceTypes: ['slm_policy'],
  isAvailable: notInServerless,
  async run(context) {
    const policies = await getSlmPolicies(context);
    return Object.entries(policies).flatMap(([name, lifecycle]) => {
      // Failing policies are already reported, with the reason.
      if (isFailing(lifecycle)) {
        return [];
      }
      const lastSuccess = toMillis(lifecycle.last_success?.time);
      const days = daysSince(lastSuccess ?? lifecycle.modified_date_millis);
      if (days <= MAX_DAYS_WITHOUT_SNAPSHOT) {
        return [];
      }
      return [
        {
          resource: toResource(name),
          related: [],
          details: [
            lastSuccess === undefined
              ? i18n.translate('xpack.snapshotRestore.housekeeping.noRecentSnapshot.never', {
                  defaultMessage:
                    'No successful snapshot since the policy changed {days, plural, one {# day} other {# days}} ago.',
                  values: { days },
                })
              : i18n.translate('xpack.snapshotRestore.housekeeping.noRecentSnapshot.last', {
                  defaultMessage:
                    'The last successful snapshot is {days, plural, one {# day} other {# days}} old.',
                  values: { days },
                }),
          ],
          evidence: {
            lastSuccess: lifecycle.last_success,
            schedule: lifecycle.policy.schedule,
            nextExecution: lifecycle.next_execution,
          },
        },
      ];
    });
  },
};

export const policyWithoutRetentionCheck: HousekeepingCheck = {
  id: 'snapshot_restore.no_retention',
  title: i18n.translate('xpack.snapshotRestore.housekeeping.noRetention.title', {
    defaultMessage: 'Snapshot policies without retention',
  }),
  description: i18n.translate('xpack.snapshotRestore.housekeeping.noRetention.description', {
    defaultMessage:
      'Nothing deletes the snapshots of these policies, so the repository keeps growing.',
  }),
  resourceTypes: ['slm_policy'],
  isAvailable: notInServerless,
  async run(context) {
    const policies = await getSlmPolicies(context);
    return Object.entries(policies).flatMap(([name, { policy }]) => {
      if (policy.retention && Object.keys(policy.retention).length > 0) {
        return [];
      }
      return [
        {
          resource: toResource(name),
          related: [],
          fix: {
            description: i18n.translate('xpack.snapshotRestore.housekeeping.noRetention.fix', {
              defaultMessage:
                'Keeps the snapshots for 30 days, and at least 5 and at most 50 of them. Change the retention to what you need before running it.',
            }),
            request: `PUT _slm/policy/${name}\n${JSON.stringify(
              { ...policy, retention: DEFAULT_RETENTION },
              null,
              2
            )}`,
          },
        },
      ];
    });
  },
};

export const snapshotRestoreChecks = [
  failingPolicyCheck,
  staleSnapshotsCheck,
  policyWithoutRetentionCheck,
];
