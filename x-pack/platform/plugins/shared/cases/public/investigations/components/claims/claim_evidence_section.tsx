/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  ClaimItem,
  EvidenceItem,
  InvestigationItem,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { useItems } from '../../hooks';
import { ICONS } from '../../icons';
import { useClaimActions } from './use_claim_actions';
import { useEvidenceByIds } from './use_evidence_lookup';
import * as i18n from './translations';

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_RESULTS = 20;

const isEvidence = (item: InvestigationItem): item is EvidenceItem => item.kind === 'evidence';

const useDebouncedValue = (value: string): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
};

export interface ClaimEvidenceSectionProps {
  record: InvestigationRecord;
  claim: ClaimItem;
  /** False when the record is closed. */
  canEdit: boolean;
  onOpenEvidence: (itemId: string) => void;
}

/** Evidence linked to a claim, with an evidence picker to link more and a button to unlink. */
export const ClaimEvidenceSection: React.FC<ClaimEvidenceSectionProps> = ({
  record,
  claim,
  canEdit,
  onOpenEvidence,
}) => {
  const { euiTheme } = useEuiTheme();
  const { patchClaim, isUpdating } = useClaimActions(record.id);
  const linkedIds = claim.claim.supporting_evidence_ids;
  const { byId, isLoading } = useEvidenceByIds(record.id, linkedIds);
  const [searchValue, setSearchValue] = useState('');
  const [selected, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const search = useDebouncedValue(searchValue.trim());

  const { data: searchData, isFetching: isSearching } = useItems(
    record.id,
    {
      kind: ['evidence'],
      ...(search.length > 0 ? { search } : {}),
      sort_field: 'created_at',
      sort_order: 'desc',
      per_page: SEARCH_RESULTS,
    },
    { enabled: canEdit }
  );

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      (searchData?.items ?? [])
        .filter(isEvidence)
        .filter(({ id }) => !linkedIds.includes(id))
        .map((item) => ({
          key: item.id,
          value: item.id,
          label: `${item.ref}: ${item.title}`,
        })),
    [searchData, linkedIds]
  );

  const link = async () => {
    const [choice] = selected;
    if (!choice?.value) {
      return;
    }
    const saved = await patchClaim(
      claim,
      { claim: { supporting_evidence_ids: [...linkedIds, choice.value] } },
      i18n.EVIDENCE_LINKED
    );
    if (saved) {
      setSelected([]);
      setSearchValue('');
    }
  };

  const unlink = (evidenceId: string) =>
    patchClaim(
      claim,
      { claim: { supporting_evidence_ids: linkedIds.filter((id) => id !== evidenceId) } },
      i18n.EVIDENCE_UNLINKED
    );

  const linkedItems = linkedIds.map((id) => ({ id, item: byId.get(id) }));

  return (
    <div data-test-subj="investigationClaimEvidence">
      {isLoading ? <EuiLoadingSpinner size="m" /> : null}
      {linkedIds.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationClaimNoEvidence">
          {i18n.NO_EVIDENCE_LINKED}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xs">
          {linkedItems.map(({ id, item }) => (
            <EuiFlexItem key={id}>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                css={css`
                  padding-block: ${euiTheme.size.xxs};
                `}
                data-test-subj="investigationClaimEvidenceRow"
              >
                <EuiFlexItem grow={false}>
                  {item ? (
                    <EuiBadge
                      color="hollow"
                      onClick={() => onOpenEvidence(id)}
                      onClickAriaLabel={i18n.OPEN_EVIDENCE(item.ref)}
                    >
                      {item.ref}
                    </EuiBadge>
                  ) : (
                    <EuiBadge color="hollow">{i18n.UNKNOWN_EVIDENCE}</EuiBadge>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">{item?.title ?? id}</EuiText>
                </EuiFlexItem>
                {item ? (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {item.created_by.name}
                    </EuiText>
                  </EuiFlexItem>
                ) : null}
                {canEdit ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      color="danger"
                      isDisabled={isUpdating}
                      onClick={() => void unlink(id)}
                      aria-label={i18n.UNLINK_ARIA(item?.ref ?? id)}
                      data-test-subj="investigationClaimUnlink"
                    >
                      {i18n.UNLINK}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      {canEdit ? (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
        >
          <EuiFlexItem>
            <EuiComboBox<string>
              fullWidth
              compressed
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.LINK_PLACEHOLDER}
              aria-label={i18n.LINK_ARIA}
              isLoading={isSearching}
              options={options}
              selectedOptions={selected}
              onChange={setSelected}
              onSearchChange={setSearchValue}
              async
              data-test-subj="investigationClaimEvidencePicker"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType={ICONS.link}
              isDisabled={selected.length === 0}
              isLoading={isUpdating}
              onClick={() => void link()}
              data-test-subj="investigationClaimLinkEvidence"
            >
              {i18n.LINK}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </div>
  );
};
ClaimEvidenceSection.displayName = 'ClaimEvidenceSection';
