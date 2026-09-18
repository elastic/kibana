/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';

export type ImpactAttachment = Attachment<typeof IMPACT_ATTACHMENT_TYPE, Impact>;

const EntityIds = ({ entityIds }: { entityIds: string[] }) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false}>
    {entityIds.map((id) => (
      <EuiFlexItem key={id} grow={false}>
        <EuiBadge color="hollow">{id}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

/** Browser UI for the investigation_impact attachment. */
export const createImpactAttachmentDefinition = (): AttachmentUIDefinition<ImpactAttachment> => ({
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.impact.attachments.label', {
      defaultMessage: 'Impact',
    }),

  getIcon: () => 'warning',

  renderInlineContent: ({ attachment }) => <EntityIds entityIds={attachment.data.entityIds} />,

  renderConversationDetailsContent: ({ attachment }) => (
    <EntityIds entityIds={attachment.data.entityIds} />
  ),
});
