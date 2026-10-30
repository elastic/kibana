/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Status } from '@kbn/cases-components/src/status/status';
import type { CaseStatusRef } from './use_case_statuses';
import { useCaseStatuses } from './use_case_statuses';

interface Props {
  theCase: CaseStatusRef;
  dataTestSubj?: string;
}

/** The status badge of a case, with the label and color of the status it is in. */
const CaseStatusBadgeComponent: React.FC<Props> = ({ theCase, dataTestSubj }) => {
  const { isCustomStatusesEnabled, getStatus } = useCaseStatuses();

  if (!isCustomStatusesEnabled) {
    return <Status status={theCase.status} dataTestSubj={dataTestSubj} />;
  }

  const { label, color } = getStatus(theCase);

  return <Status status={theCase.status} label={label} color={color} dataTestSubj={dataTestSubj} />;
};

CaseStatusBadgeComponent.displayName = 'CaseStatusBadge';

export const CaseStatusBadge = memo(CaseStatusBadgeComponent);
