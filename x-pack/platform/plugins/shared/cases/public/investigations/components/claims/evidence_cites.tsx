/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { EvidenceItem } from '../../../../common/investigations/types';
import * as i18n from './translations';

export interface EvidenceCitesProps {
  /** Evidence refs such as "E12". */
  refs: readonly string[];
  /** Resolved evidence by ref; refs missing here render as plain badges. */
  byRef: ReadonlyMap<string, EvidenceItem>;
  onOpenEvidence: (itemId: string) => void;
}

/** Small buttons that open the cited evidence item. */
export const EvidenceCites: React.FC<EvidenceCitesProps> = ({ refs, byRef, onOpenEvidence }) => {
  if (refs.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap
      data-test-subj="investigationEvidenceCites"
    >
      {refs.map((ref) => {
        const item = byRef.get(ref);
        return (
          <EuiFlexItem grow={false} key={ref}>
            {item ? (
              <EuiToolTip content={item.title} position="top">
                <EuiBadge
                  color="hollow"
                  onClick={() => onOpenEvidence(item.id)}
                  onClickAriaLabel={i18n.OPEN_EVIDENCE(ref)}
                  data-test-subj={`investigationCite-${ref}`}
                >
                  {ref}
                </EuiBadge>
              </EuiToolTip>
            ) : (
              <EuiBadge color="hollow" data-test-subj={`investigationCite-${ref}`}>
                {ref}
              </EuiBadge>
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
EvidenceCites.displayName = 'EvidenceCites';
