/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Check } from '../../../../common/graphql/types';
import { CondensedCheck } from './types';

const inferCondensedFields = (
  check: CondensedCheck,
  currentStatus: string,
  currentTimestamp: string
) => {
  const { status: condensedStatus, timestamp } = check;
  if (condensedStatus !== currentStatus && condensedStatus !== 'mixed') {
    check.status = 'mixed';
  }
  if (timestamp < currentTimestamp) {
    check.timestamp = currentTimestamp;
  }
};

export const toCondensedCheck = (checks: Check[]) => {
  const condensedChecks: Map<string | null, CondensedCheck> = new Map();
  checks.forEach((check: Check) => {
    const location = get<string | null>(check, 'observer.geo.name', null);
    const {
      monitor: { ip, status },
      timestamp,
    } = check;
    let condensedCheck: CondensedCheck | undefined;
    if ((condensedCheck = condensedChecks.get(location))) {
      condensedCheck.childStatuses.push({ ip, status, timestamp });
      inferCondensedFields(condensedCheck, status, timestamp);
    } else {
      condensedChecks.set(location, {
        childStatuses: [{ ip, status, timestamp }],
        location,
        status,
        timestamp,
      });
    }
  });
  return Array.from(condensedChecks.values());
};
