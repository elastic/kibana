/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DetailsBlock } from '../details/detail_block';
import { ImpactEntityList } from './impact_entity_list';
import { selectImpactEntities, type OpenImpactEntity } from './impact_entities';
import { IMPACT_LABELS } from './translations';

export interface AttachmentsTabProps {
  /** The conversation's attachments, unfiltered. */
  attachments: VersionedAttachment[] | undefined;
  onOpenImpactEntity?: OpenImpactEntity;
}

/**
 * Attachments tab body. Impact is its own group, read from `investigation_impact`.
 * Attack, alert, rule, and entity rows stay on Overview until that inventory moves here.
 */
export const AttachmentsTab = memo<AttachmentsTabProps>(({ attachments, onOpenImpactEntity }) => {
  const entities = useMemo(() => selectImpactEntities(attachments), [attachments]);

  if (entities.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationImpactEmpty">
        <p>{IMPACT_LABELS.empty}</p>
      </EuiText>
    );
  }

  return (
    <DetailsBlock title={IMPACT_LABELS.groupTitle}>
      <ImpactEntityList entities={entities} onOpenImpactEntity={onOpenImpactEntity} />
    </DetailsBlock>
  );
});

AttachmentsTab.displayName = 'AttachmentsTab';
