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
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { entityStoreIdType, type ImpactEntityTarget } from '@kbn/agentic-investigations-common';
import type { Impact, ImpactEntity } from '../../../common/impact/impact';
import { EvidenceView } from '../../evidence/evidence_view';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';

/** Impact summaries longer than this are cut short behind "Show more". */
const IMPACT_SUMMARY_MAX_LENGTH = 500;

const entityLabel = (entity: ImpactEntity): string => entity.name ?? entity.id;

/** Cuts `text` to at most `maxLength` characters at a word boundary and marks the cut. */
const truncateAtWord = (text: string, maxLength: number): string =>
  truncate(text, { length: maxLength, separator: ' ', omission: '…' });

const EntityHeader = ({ entity }: { entity: ImpactEntity }) => (
  <EuiText size="s" textAlign="left">
    <strong>{entityLabel(entity)}</strong>
    {entity.type && (
      <EuiTextColor color="subdued" data-test-subj="investigationImpactEntityType">
        {` · ${entity.type}`}
      </EuiTextColor>
    )}
  </EuiText>
);

const FlyoutEntityButton = ({
  entity,
  onOpenEntity,
}: {
  entity: ImpactEntity;
  onOpenEntity: (entity: ImpactEntityTarget) => void;
}) => (
  <button
    type="button"
    css={css({
      display: 'block',
      width: '100%',
      textAlign: 'left',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    })}
    data-test-subj="investigationImpactEntityFlyout"
    onClick={() => onOpenEntity({ id: entity.id, name: entity.name, type: entity.type })}
  >
    <EntityHeader entity={entity} />
  </button>
);

/**
 * One impacted entity. Evidence stays collapsed, matching the Nightshift impact section. An
 * entity-store id opens the entity flyout; a plain name does not.
 */
const ImpactEntityRow = ({
  entity,
  isLast,
  onOpenEntity,
}: {
  entity: ImpactEntity;
  isLast: boolean;
  onOpenEntity?: (entity: ImpactEntityTarget) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationImpactEntity' });
  const opensFlyout = onOpenEntity !== undefined && entityStoreIdType(entity.id) !== undefined;
  const header = opensFlyout ? (
    <FlyoutEntityButton entity={entity} onOpenEntity={onOpenEntity} />
  ) : (
    <EntityHeader entity={entity} />
  );

  return (
    <EuiPanel
      color="transparent"
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      borderRadius="none"
      data-test-subj="investigationImpactEntityRow"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
    >
      {entity.evidence && opensFlyout ? (
        <>
          {header}
          <EuiAccordion
            id={accordionId}
            buttonContent={i18n.translate(
              'xpack.agenticInvestigations.impact.attachments.entityEvidence',
              { defaultMessage: 'Evidence' }
            )}
            paddingSize="none"
            data-test-subj="investigationImpactEntityAccordion"
          >
            <EuiSpacer size="s" />
            <EvidenceView evidence={entity.evidence} outlineChart={false} />
          </EuiAccordion>
        </>
      ) : entity.evidence ? (
        <EuiAccordion
          id={accordionId}
          buttonContent={header}
          paddingSize="none"
          data-test-subj="investigationImpactEntityAccordion"
        >
          <EuiSpacer size="s" />
          <EvidenceView evidence={entity.evidence} outlineChart={false} />
        </EuiAccordion>
      ) : (
        header
      )}
    </EuiPanel>
  );
};

const EntityList = ({
  entities,
  onOpenEntity,
}: {
  entities: ImpactEntity[];
  onOpenEntity?: (entity: ImpactEntityTarget) => void;
}) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    paddingSize="none"
    data-test-subj="investigationImpactEntities"
  >
    {entities.map((entity, index) => (
      <ImpactEntityRow
        key={entity.id}
        entity={entity}
        isLast={index === entities.length - 1}
        onOpenEntity={onOpenEntity}
      />
    ))}
  </EuiPanel>
);

const EntityBadges = ({ entities }: { entities: ImpactEntity[] }) => (
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
 * flyout matches Nightshift's impact section. An entity-store id opens the entity flyout; the
 * inline chat render lists entities only.
 */
export const ImpactView: React.FC<
  InvestigationAttachmentContentProps<Impact> & {
    /** Present when a solution registered an entity flyout. Entity-store ids open it. */
    onOpenEntity?: (entity: ImpactEntityTarget) => void;
  }
> = ({ document: { summary, evidence, entities = [] }, variant, onOpenEntity }) => {
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
