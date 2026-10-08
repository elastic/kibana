/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Impact, ImpactEntity } from '../../../common/impact/impact';
import { EvidenceView } from '../../evidence/evidence_view';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';

const entityLabel = (entity: ImpactEntity): string => entity.name ?? entity.id;

const EntityBadges = ({ entities }: { entities: ImpactEntity[] }) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false} data-test-subj="investigationImpactEntities">
    {entities.map((entity) => (
      <EuiFlexItem key={entity.id} grow={false}>
        <EuiBadge color="hollow">{entityLabel(entity)}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const EntitiesWithEvidence = ({ entities }: { entities: ImpactEntity[] }) => (
  <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationImpactEntities">
    {entities.map((entity) => (
      <EuiFlexItem key={entity.id} grow={false} data-test-subj="investigationImpactEntity">
        <EuiTitle size="xxs">
          <h4>{entityLabel(entity)}</h4>
        </EuiTitle>
        {entity.evidence && <EvidenceView evidence={entity.evidence} />}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

/**
 * Impact of an investigation: the summary, its evidence, and the affected entities. The details
 * flyout shows each entity's evidence; the inline chat render lists entities only.
 */
export const ImpactView: React.FC<InvestigationAttachmentContentProps<Impact>> = ({
  document: { summary, evidence, entities = [] },
  variant,
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

  const showEntityEvidence =
    variant === 'details' && entities.some((entity) => entity.evidence !== undefined);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationImpact">
      {hasSummary && (
        <EuiFlexItem grow={false} data-test-subj="investigationImpactSummary">
          <EuiMarkdownFormat textSize="s">{summary ?? ''}</EuiMarkdownFormat>
        </EuiFlexItem>
      )}
      {evidence && (
        <EuiFlexItem grow={false}>
          <EvidenceView evidence={evidence} />
        </EuiFlexItem>
      )}
      {entities.length > 0 && (
        <EuiFlexItem grow={false}>
          {showEntityEvidence ? (
            <EntitiesWithEvidence entities={entities} />
          ) : (
            <EntityBadges entities={entities} />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
