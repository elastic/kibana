/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ClaimItem, InvestigationRecord } from '../../../../common/investigations/types';
import type { TabId } from '../tabs/tab_props';
import { ArgumentFlyout } from './argument_flyout';
import { buildClaimArgument } from './claim_utils';
import { useEvidenceByIds } from './use_evidence_lookup';
import * as i18n from './translations';

export interface ClaimArgumentFlyoutProps {
  record: InvestigationRecord;
  claim: ClaimItem;
  onClose: () => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
}

/** The argument of a claim: the stored one, or one built from its linked evidence and reasoning. */
export const ClaimArgumentFlyout: React.FC<ClaimArgumentFlyoutProps> = ({
  record,
  claim,
  onClose,
  onNavigateTab,
}) => {
  const stored = claim.claim.argument ?? null;
  const { byId, isLoading } = useEvidenceByIds(
    record.id,
    stored ? [] : claim.claim.supporting_evidence_ids
  );
  const argument = useMemo(() => stored ?? buildClaimArgument(claim, byId), [stored, claim, byId]);

  if (isLoading) {
    return null;
  }

  return (
    <ArgumentFlyout
      record={record}
      argument={argument}
      title={i18n.CLAIM_REF(claim.ref)}
      onClose={onClose}
      onNavigateTab={onNavigateTab}
    />
  );
};
ClaimArgumentFlyout.displayName = 'ClaimArgumentFlyout';
