/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import type { ApprovalProposal } from './types';
import { getProposalCaptionParts } from './proposal_helpers';

export interface ProposalCaptionProps {
  proposal: ApprovalProposal;
  /** Adds the impact and the decision deadline. See `getProposalCaption`. */
  includeRiskDetails?: boolean;
}

/** Shows the same line as `getProposalCaption`, with "Irreversible" in the danger color. */
export const ProposalCaption = ({ proposal, includeRiskDetails }: ProposalCaptionProps) => (
  <>
    {getProposalCaptionParts(proposal, { includeRiskDetails }).map(
      ({ text, isIrreversible }, index) => (
        <React.Fragment key={text}>
          {index > 0 && ' • '}
          {isIrreversible ? <EuiTextColor color="danger">{text}</EuiTextColor> : text}
        </React.Fragment>
      )
    )}
  </>
);
