/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { truncate } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import {
  GroupedAttachmentList,
  GroupedAttachmentRow,
  impactEntityFlyoutType,
  type GroupedAttachmentRowAction,
  type ImpactEntityTarget,
} from '@kbn/agentic-investigations-common';
import type { Impact } from '../../../common/impact/impact';
import type { InvestigationEvidence } from '../../../common/evidence';
import { EvidenceView } from '../../evidence/evidence_view';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';

/** The impact fields this view reads, shared by the stored document and the query API. */
export interface ImpactContentEntity {
  id: string;
  name?: string;
  type?: string;
  evidence?: InvestigationEvidence;
}

export interface ImpactContentProps {
  summary?: string;
  evidence?: InvestigationEvidence;
  entities?: ImpactContentEntity[];
  /** `details` also renders per-entity evidence. */
  variant: 'inline' | 'details';
  /** Present when a solution registered an entity flyout. Hosts, users, and services open it. */
  onOpenEntity?: (entity: ImpactEntityTarget) => void;
}

/** Impact summaries longer than this are cut short behind "Show more". */
const IMPACT_SUMMARY_MAX_LENGTH = 500;

const entityLabel = (entity: ImpactContentEntity): string => entity.name ?? entity.id;

/** Cuts `text` to at most `maxLength` characters at a word boundary and marks the cut. */
const truncateAtWord = (text: string, maxLength: number): string =>
  truncate(text, { length: maxLength, separator: ' ', omission: '…' });

/** Same icons the Security entity store uses, so an impacted host reads as a host everywhere. */
const ENTITY_ICON_BY_TYPE: Record<string, IconType> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
};

const entityIconType = (entity: ImpactContentEntity): IconType =>
  ENTITY_ICON_BY_TYPE[impactEntityFlyoutType(entity) ?? ''] ?? 'globe';

/**
 * One impacted entity, styled like a "What's happened" row. A host, user, or service opens the
 * entity flyout, whether recorded by Entity Store id or by name; anything else is a label.
 * Evidence stays collapsed behind the row, matching the Nightshift impact section; when an entity
 * has both, the row expands and the flyout opens from the body.
 */
const ImpactEntityRow = ({
  entity,
  onOpenEntity,
}: {
  entity: ImpactContentEntity;
  onOpenEntity?: (entity: ImpactEntityTarget) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setExpanded] = useState(false);
  const opensFlyout = onOpenEntity !== undefined && impactEntityFlyoutType(entity) !== undefined;
  const openEntity = () => onOpenEntity?.({ id: entity.id, name: entity.name, type: entity.type });

  let action: GroupedAttachmentRowAction | undefined;
  if (entity.evidence) {
    action = { kind: 'expand', isExpanded, onToggle: () => setExpanded((prev) => !prev) };
  } else if (opensFlyout) {
    action = { kind: 'flyout', onClick: openEntity };
  }

  return (
    <GroupedAttachmentRow
      iconType={entityIconType(entity)}
      iconColor="subdued"
      title={entityLabel(entity)}
      subtitle={entity.type ?? impactEntityFlyoutType(entity)}
      action={action}
      data-test-subj="investigationImpactEntityRow"
    >
      {entity.evidence && isExpanded && (
        <div
          css={css`
            padding: 0 ${euiTheme.size.base} 12px;
          `}
          data-test-subj="investigationImpactEntityEvidence"
        >
          <EvidenceView evidence={entity.evidence} outlineChart={false} />
          {opensFlyout && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="maximize"
              onClick={openEntity}
              data-test-subj="investigationImpactEntityFlyout"
            >
              {i18n.translate('xpack.agenticInvestigations.impact.attachments.openEntity', {
                defaultMessage: 'Open {name}',
                values: { name: entityLabel(entity) },
              })}
            </EuiButtonEmpty>
          )}
        </div>
      )}
    </GroupedAttachmentRow>
  );
};

const EntityList = ({
  entities,
  onOpenEntity,
}: {
  entities: ImpactContentEntity[];
  onOpenEntity?: (entity: ImpactEntityTarget) => void;
}) => (
  <GroupedAttachmentList data-test-subj="investigationImpactEntities">
    {entities.map((entity) => (
      <ImpactEntityRow key={entity.id} entity={entity} onOpenEntity={onOpenEntity} />
    ))}
  </GroupedAttachmentList>
);

const EntityBadges = ({ entities }: { entities: ImpactContentEntity[] }) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false} data-test-subj="investigationImpactEntities">
    {entities.map((entity) => (
      <EuiFlexItem key={entity.id} grow={false}>
        <EuiBadge color="hollow">{entityLabel(entity)}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const ImpactSummary = ({ summary }: { summary: string }) => {
  const [expanded, setExpanded] = useState(false);
  const trimmed = summary.trim();
  const isLong = trimmed.length > IMPACT_SUMMARY_MAX_LENGTH;
  const shown = isLong && !expanded ? truncateAtWord(trimmed, IMPACT_SUMMARY_MAX_LENGTH) : trimmed;

  return (
    <div data-test-subj="investigationImpactSummary">
      <EuiMarkdownFormat textSize="s">{shown}</EuiMarkdownFormat>
      {isLong && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          data-test-subj="investigationImpactShowMore"
        >
          {expanded
            ? i18n.translate('xpack.agenticInvestigations.impact.attachments.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.agenticInvestigations.impact.attachments.showMore', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      )}
    </div>
  );
};

/**
 * Impact of an investigation: evidence, the summary, and the affected entities. The details
 * flyout matches Nightshift's impact section. A host, user, or service opens the entity flyout;
 * the inline chat render lists entities only.
 */
export const ImpactContent: React.FC<ImpactContentProps> = ({
  summary,
  evidence,
  entities = [],
  variant,
  onOpenEntity,
}) => {
  const hasSummary = Boolean(summary?.trim());
  if (!hasSummary && !evidence && entities.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationImpactEmpty">
        {i18n.translate('xpack.agenticInvestigations.impact.attachments.empty', {
          defaultMessage: 'No impact recorded yet.',
        })}
      </EuiText>
    );
  }

  if (variant !== 'details') {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationImpact">
        {hasSummary && (
          <EuiFlexItem grow={false}>
            <ImpactSummary summary={summary ?? ''} />
          </EuiFlexItem>
        )}
        {entities.length > 0 && (
          <EuiFlexItem grow={false}>
            <EntityBadges entities={entities} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationImpact">
      {evidence && (
        <EuiFlexItem grow={false} data-test-subj="investigationImpactEvidence">
          <EvidenceView evidence={evidence} />
        </EuiFlexItem>
      )}
      {hasSummary && (
        <EuiFlexItem grow={false}>
          <ImpactSummary summary={summary ?? ''} />
        </EuiFlexItem>
      )}
      {entities.length > 0 && (
        <EuiFlexItem grow={false}>
          <EntityList entities={entities} onOpenEntity={onOpenEntity} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const ImpactView: React.FC<
  InvestigationAttachmentContentProps<Impact> & Pick<ImpactContentProps, 'onOpenEntity'>
> = ({ document: { summary, evidence, entities }, variant, onOpenEntity }) => (
  <ImpactContent
    summary={summary}
    evidence={evidence}
    entities={entities}
    variant={variant}
    onOpenEntity={onOpenEntity}
  />
);
