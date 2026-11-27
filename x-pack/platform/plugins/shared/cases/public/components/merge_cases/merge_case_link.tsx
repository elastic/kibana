/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import { CaseDetailsLink } from '../links';
import { getCaseReference } from './utils';

export const MergeCaseLink = React.memo<{ caseSnapshot: MergeCaseSnapshot }>(({ caseSnapshot }) => (
  <CaseDetailsLink detailName={caseSnapshot.id} title={caseSnapshot.title} target="_blank">
    {getCaseReference(caseSnapshot)}
  </CaseDetailsLink>
));
MergeCaseLink.displayName = 'MergeCaseLink';
