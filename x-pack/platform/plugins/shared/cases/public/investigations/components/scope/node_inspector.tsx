/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { EntityItem, EntityScope, LinkItem } from '../../../../common/investigations/types';
import { LINK_KIND_ICONS, ENTITY_TYPE_ICONS, ICONS } from '../../icons';
import type { TabProps } from '../tabs/tab_props';
import { CriticalityPill, LinkStatusBadge, RiskChip, ScopeStatusBadge } from './entity_badges';
import {
  ENTITY_KIND_LABELS,
  SCOPE_STATUS_LABELS,
  SELECTABLE_SCOPE_STATUSES,
} from './scope_helpers';
import { useItemsByIds } from './use_items_by_ids';
import * as i18n from './translations';

export interface NodeInspectorProps {
  recordId: string;
  entity: EntityItem;
  connections: readonly LinkItem[];
  entitiesById: ReadonlyMap<string, EntityItem>;
  isUpdating: boolean;
  onSetStatus: (entity: EntityItem, status: EntityScope) => void;
  onSelectEdge: (linkId: string) => void;
  onAddLinkFrom: (entityId: string) => void;
  onNavigateTab: TabProps['onNavigateTab'];
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  recordId,
  entity,
  connections,
  entitiesById,
  isUpdating,
  onSetStatus,
  onSelectEdge,
  onAddLinkFrom,
  onNavigateTab,
}) => {
  const { entity: details, status } = entity;
  const { itemsById: evidenceById } = useItemsByIds(recordId, 'evidence', details.evidence_ids);
  const attributes = details.attributes ?? [];
  const tags = details.tags ?? [];
  const isExternal = status === 'external';

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      role="region"
      aria-label={i18n.INSPECTOR_LABEL}
      data-test-subj="investigationScopeNodeInspector"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={ENTITY_TYPE_ICONS[details.type]} size="l" aria-hidden="true" />
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
              {details.name}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {ENTITY_KIND_LABELS[details.type]} {entity.ref}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ScopeStatusBadge status={status} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <CriticalityPill criticality={details.criticality} />
        </EuiFlexItem>
        {details.risk_score !== null && details.risk_score !== undefined ? (
          <EuiFlexItem grow={false}>
            <RiskChip score={details.risk_score} />
          </EuiFlexItem>
        ) : null}
        {details.risk_level ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.RISK_LEVEL(details.risk_level)}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isExternal ? null : (
        <>
          <EuiFormRow label={i18n.FIELD_SCOPE_STATUS} display="rowCompressed" fullWidth>
            <EuiSelect
              compressed
              fullWidth
              disabled={isUpdating}
              value={status}
              options={SELECTABLE_SCOPE_STATUSES.map((value) => ({
                value,
                text: SCOPE_STATUS_LABELS[value],
              }))}
              onChange={(event) => {
                const next = SELECTABLE_SCOPE_STATUSES.find(
                  (value) => value === event.target.value
                );
                if (next && next !== status) {
                  onSetStatus(entity, next);
                }
              }}
              aria-label={i18n.FIELD_SCOPE_STATUS}
              data-test-subj="investigationScopeStatusSelect"
            />
          </EuiFormRow>
          {status === 'suspected' ? (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    isLoading={isUpdating}
                    onClick={() => onSetStatus(entity, 'scoped')}
                    data-test-subj="investigationScopeAddToScope"
                  >
                    {i18n.ACTION_ADD_TO_SCOPE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    isLoading={isUpdating}
                    onClick={() => onSetStatus(entity, 'dismissed')}
                    data-test-subj="investigationScopeDismiss"
                  >
                    {i18n.ACTION_DISMISS}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
          <EuiSpacer size="m" />
        </>
      )}

      <EuiText size="xs">
        <strong>{i18n.SECTION_ATTRIBUTES}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {attributes.length > 0 ? (
        <EuiDescriptionList
          type="column"
          compressed
          columnWidths={[1, 2]}
          listItems={attributes.map(([title, description]) => ({ title, description }))}
          data-test-subj="investigationScopeAttributes"
        />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_ATTRIBUTES}
        </EuiText>
      )}

      {tags.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <strong>{i18n.SECTION_TAGS}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}

      <EuiSpacer size="m" />
      <EuiText size="xs">
        <strong>{i18n.SECTION_EVIDENCE}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {details.evidence_ids.length > 0 ? (
        <EuiFlexGroup
          gutterSize="xs"
          wrap
          responsive={false}
          data-test-subj="investigationScopeEvidenceRefs"
        >
          {details.evidence_ids.map((evidenceId) => {
            const evidence = evidenceById.get(evidenceId);
            const ref = evidence?.ref ?? evidenceId.slice(0, 6);
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

      <EuiSpacer size="m" />
      <EuiText size="xs">
        <strong>{i18n.SECTION_CONNECTIONS}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {connections.length > 0 ? (
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          responsive={false}
          data-test-subj="investigationScopeConnections"
        >
          {connections.map((link) => {
            const outgoing = link.link.from_id === entity.id;
            const otherId = outgoing ? link.link.to_id : link.link.from_id;
            const other = entitiesById.get(otherId);
            return (
              <EuiFlexItem grow={false} key={link.id}>
                <EuiPanel
                  paddingSize="s"
                  hasShadow={false}
                  hasBorder
                  onClick={() => onSelectEdge(link.id)}
                  aria-label={i18n.OPEN_CONNECTION(link.link.label)}
                  data-test-subj={`investigationScopeConnection-${link.id}`}
                >
                  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={LINK_KIND_ICONS[link.link.kind]} size="s" aria-hidden="true" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {outgoing ? i18n.CONNECTION_TO : i18n.CONNECTION_FROM}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{other?.entity.name ?? otherId}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {link.link.label}
                      </EuiText>
                    </EuiFlexItem>
                    {link.status !== 'confirmed' ? (
                      <EuiFlexItem grow={false}>
                        <LinkStatusBadge status={link.status} />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_CONNECTIONS}
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="xs"
        iconType={ICONS.add}
        onClick={() => onAddLinkFrom(entity.id)}
        data-test-subj="investigationScopeAddLinkFromHere"
      >
        {i18n.ADD_LINK_FROM_HERE}
      </EuiButtonEmpty>
    </EuiPanel>
  );
};
NodeInspector.displayName = 'NodeInspector';
