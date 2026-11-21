/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { LINK_KIND_LABELS } from '../../../../common/investigations/types';
import type { EntityItem, LinkItem, LinkStatus } from '../../../../common/investigations/types';
import { ICONS, LINK_KIND_ICONS } from '../../icons';
import type { TabProps } from '../tabs/tab_props';
import { LinkStatusBadge } from './entity_badges';
import { LINK_STATUS_LABELS } from './scope_helpers';
import { useItemsByIds } from './use_items_by_ids';
import * as i18n from './translations';

const LINK_STATUSES: readonly LinkStatus[] = ['confirmed', 'suspected', 'dismissed'];

export interface EdgeInspectorProps {
  recordId: string;
  link: LinkItem;
  entitiesById: ReadonlyMap<string, EntityItem>;
  isUpdating: boolean;
  onSetStatus: (link: LinkItem, status: LinkStatus) => void;
  onSelectNode: (entityId: string) => void;
  onNavigateTab: TabProps['onNavigateTab'];
}

export const EdgeInspector: React.FC<EdgeInspectorProps> = ({
  recordId,
  link,
  entitiesById,
  isUpdating,
  onSetStatus,
  onSelectNode,
  onNavigateTab,
}) => {
  const { link: details, status } = link;
  const from = entitiesById.get(details.from_id);
  const to = entitiesById.get(details.to_id);
  const { itemsById: evidenceById } = useItemsByIds(recordId, 'evidence', details.evidence_ids);
  const claimIds = useMemo(() => (details.claim_id ? [details.claim_id] : []), [details.claim_id]);
  const { itemsById: claimsById } = useItemsByIds(recordId, 'claim', claimIds);
  const claim = details.claim_id ? claimsById.get(details.claim_id) : undefined;

  const nodeButton = (entityId: string, entity?: EntityItem) => (
    <EuiButtonEmpty
      size="xs"
      flush="left"
      onClick={() => onSelectNode(entityId)}
      data-test-subj={`investigationScopeEdgeNode-${entityId}`}
    >
      {entity?.entity.name ?? entityId}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      role="region"
      aria-label={i18n.INSPECTOR_LABEL}
      data-test-subj="investigationScopeEdgeInspector"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={LINK_KIND_ICONS[details.kind]} size="l" aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiTitle size="xs">
            <h3
              css={css`
                overflow-wrap: anywhere;
              `}
              data-test-subj="investigationScopeInspectorTitle"
            >
              {details.label}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {LINK_KIND_LABELS[details.kind]} {link.ref}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkStatusBadge status={status} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type="column"
        compressed
        columnWidths={[1, 2]}
        listItems={[
          { title: i18n.EDGE_FROM, description: nodeButton(details.from_id, from) },
          { title: i18n.EDGE_TO, description: nodeButton(details.to_id, to) },
          { title: i18n.EDGE_KIND, description: LINK_KIND_LABELS[details.kind] },
          { title: i18n.EDGE_LABEL, description: details.label },
        ]}
      />
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.EDGE_STATUS} display="rowCompressed" fullWidth>
        <EuiSelect
          compressed
          fullWidth
          disabled={isUpdating}
          value={status}
          options={LINK_STATUSES.map((value) => ({ value, text: LINK_STATUS_LABELS[value] }))}
          onChange={(event) => {
            const next = LINK_STATUSES.find((value) => value === event.target.value);
            if (next && next !== status) {
              onSetStatus(link, next);
            }
          }}
          aria-label={i18n.EDGE_STATUS}
          data-test-subj="investigationScopeLinkStatusSelect"
        />
      </EuiFormRow>
      {status === 'suspected' ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isUpdating}
                onClick={() => onSetStatus(link, 'confirmed')}
                data-test-subj="investigationScopeConfirmLink"
              >
                {i18n.MARK_CONFIRMED}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.CONFIRM_HINT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}

      <EuiSpacer size="m" />
      <EuiText size="xs">
        <strong>{i18n.EDGE_DESCRIPTION}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s" color={details.description ? 'default' : 'subdued'}>
        {details.description || i18n.NO_DESCRIPTION}
      </EuiText>

      <EuiSpacer size="m" />
      <EuiText size="xs">
        <strong>{i18n.SECTION_EVIDENCE}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {details.evidence_ids.length > 0 ? (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {details.evidence_ids.map((evidenceId) => {
            const ref = evidenceById.get(evidenceId)?.ref ?? evidenceId.slice(0, 6);
            return (
              <EuiFlexItem grow={false} key={evidenceId}>
                <EuiBadge
                  color="hollow"
                  onClick={() => onNavigateTab('evidence', { itemId: evidenceId })}
                  onClickAriaLabel={i18n.OPEN_EVIDENCE(ref)}
                  data-test-subj={`investigationScopeEvidenceRef-${ref}`}
                >
                  {ref}
                </EuiBadge>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_EVIDENCE}
        </EuiText>
      )}

      {details.claim_id ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <strong>{i18n.EDGE_CLAIM}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiBadge
            color="hollow"
            iconType={ICONS.claim}
            onClick={() => onNavigateTab('overview', { itemId: details.claim_id ?? undefined })}
            onClickAriaLabel={i18n.OPEN_CLAIM(claim?.ref ?? '')}
            data-test-subj="investigationScopeClaimRef"
          >
            {claim?.ref ?? details.claim_id.slice(0, 6)}
          </EuiBadge>
          {claim ? (
            <EuiText size="s">
              <p>{claim.title}</p>
            </EuiText>
          ) : null}
        </>
      ) : null}
    </EuiPanel>
  );
};
EdgeInspector.displayName = 'EdgeInspector';
