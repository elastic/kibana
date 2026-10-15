/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import { toRenderAttachment } from '../grouped_attachments/to_render_attachment';
import { renderImpactDetails } from '../impact/impact_details_renderer';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';

/** Spelled out: this package cannot import the investigations plugin. */
const IMPACT_ATTACHMENT_TYPE = 'investigation_impact';

export interface ImpactSectionProps {
  attachments: VersionedAttachment[] | undefined;
}

/**
 * Impact is stored hidden so the chat does not render it. The overview still shows it, as its
 * own section rather than a row inside the grouped attachments.
 */
export const ImpactSection = memo<ImpactSectionProps>(({ attachments }) => {
  const sections = useMemo(
    () =>
      getActiveAttachments(attachments ?? [])
        .filter((attachment) => attachment.type === IMPACT_ATTACHMENT_TYPE)
        .map((attachment) => {
          const content = renderImpactDetails(toRenderAttachment(attachment).data);
          if (!content) {
            return null;
          }
          return <div key={attachment.id}>{content}</div>;
        })
        .filter(Boolean),
    [attachments]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem>
      <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.impact}>{sections}</DetailsBlock>
    </EuiFlexItem>
  );
});

ImpactSection.displayName = 'ImpactSection';
