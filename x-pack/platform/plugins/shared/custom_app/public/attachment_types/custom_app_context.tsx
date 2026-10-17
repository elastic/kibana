/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type {
  CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  CustomAppContextAttachmentData,
} from '../../common/app_context_attachment';

const LazyAppCard = React.lazy(() =>
  import('./app_card').then((module) => ({ default: module.AppCard }))
);

/** How a custom app is shown as an attachment of a chat. */
export const customAppContextAttachmentUiDefinition: AttachmentUIDefinition<
  Attachment<typeof CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE, CustomAppContextAttachmentData>
> = {
  getLabel: (attachment) =>
    attachment.data.panel_title ||
    i18n.translate('xpack.customApp.attachment.label', { defaultMessage: 'Custom app' }),
  getIcon: () => 'apps',
  renderInlineContent: ({ attachment }, callbacks) => (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LazyAppCard
        document={attachment.data.document}
        title={attachment.data.panel_title}
        // An app that came from a panel is already on a dashboard.
        canSave={!attachment.data.embeddable_id}
        registerActionButtons={callbacks?.registerActionButtons}
      />
    </Suspense>
  ),
};
