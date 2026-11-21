/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { EvidenceItem, ProposalItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { EvidenceCites } from '../claims/evidence_cites';
import * as i18n from './translations';

interface ScopeRow {
  key: string;
  value: string;
}

const SCOPE_COLUMNS: Array<EuiBasicTableColumn<ScopeRow>> = [
  { field: 'key', name: i18n.SCOPE_COLUMN_ITEM, width: '12em', truncateText: false },
  { field: 'value', name: i18n.SCOPE_COLUMN_DETAIL, truncateText: false },
];

export interface ApproveModalProps {
  proposal: ProposalItem;
  evidenceById: ReadonlyMap<string, EvidenceItem>;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenEvidence: (itemId: string) => void;
}

/** Confirms a medium or high disruption proposal after showing what will happen. */
export const ApproveModal: React.FC<ApproveModalProps> = ({
  proposal,
  evidenceById,
  isLoading,
  onConfirm,
  onCancel,
  onOpenEvidence,
}) => {
  const titleId = useGeneratedHtmlId();
  const checkboxId = useGeneratedHtmlId({ prefix: 'approveAck' });
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const { proposal: details } = proposal;
  const isHigh = details.disruption === 'high';
  const interrupts = details.scope.find(([key]) => key === 'Interrupts')?.[1] ?? '';
  const rows = details.scope.map(([key, value]) => ({ key, value }));
  const linked = details.evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceItem => item !== undefined);
  const byRef = new Map(linked.map((item) => [item.ref, item]));

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={titleId}
      maxWidth={640}
      data-test-subj="investigationApproveModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.APPROVE_MODAL_TITLE(proposal.title)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          announceOnMount
          size="s"
          color={isHigh ? 'danger' : 'warning'}
          iconType={ICONS.disruptive}
          title={isHigh ? i18n.APPROVE_CALLOUT_DISRUPTIVE : i18n.APPROVE_CALLOUT_WIDE}
        />
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{i18n.WHAT_WILL_HAPPEN}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {rows.length > 0 ? (
          <EuiBasicTable<ScopeRow>
            tableCaption={i18n.SCOPE_TABLE_CAPTION}
            items={rows}
            columns={SCOPE_COLUMNS}
            rowHeader="key"
            data-test-subj="investigationApproveScope"
          />
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NO_SCOPE}
          </EuiText>
        )}
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{i18n.WHY_PROPOSED}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {details.effect}
        </EuiText>
        <EuiSpacer size="xs" />
        <EvidenceCites
          refs={linked.map(({ ref }) => ref)}
          byRef={byRef}
          onOpenEvidence={onOpenEvidence}
        />
        {isHigh ? (
          <>
            <EuiSpacer size="m" />
            <EuiCheckbox
              id={checkboxId}
              label={i18n.ACKNOWLEDGE(interrupts.toLowerCase() || i18n.THE_TARGET)}
              checked={isAcknowledged}
              onChange={(event) => setIsAcknowledged(event.target.checked)}
              data-test-subj="investigationApproveAcknowledge"
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="investigationApproveCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          color={isHigh ? 'danger' : 'primary'}
          isDisabled={isHigh && !isAcknowledged}
          isLoading={isLoading}
          onClick={onConfirm}
          data-test-subj="investigationApproveConfirm"
        >
          {details.confirm_label || i18n.APPROVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ApproveModal.displayName = 'ApproveModal';
