/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import {
  ProposedActionStatusBadge,
  getApprovalOutcomeBadge,
  getProposalDecision,
} from '@kbn/proposals-ui';
import { REPLACED_BADGE } from '../translations';

/** The proposal's outcome as the AlertZero queue shows it, or "Replaced" once it was revised. */
export const ProposalStatusBadge = ({ proposal }: { proposal: ProposalWithMetadata }) => {
  if (proposal.supersededBy !== undefined || proposal.status === 'superseded') {
    return <ProposedActionStatusBadge color="hollow" iconType="branch" label={REPLACED_BADGE} />;
  }
  const decision = getProposalDecision(proposal);
  const badge = decision ? getApprovalOutcomeBadge(decision.status) : undefined;
  return <ProposedActionStatusBadge {...badge} />;
};

ProposalStatusBadge.displayName = 'ProposalStatusBadge';
