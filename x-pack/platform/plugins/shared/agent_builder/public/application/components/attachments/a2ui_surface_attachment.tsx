/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { A2UISurfaceAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

const LazyA2UIRenderer = React.lazy(() =>
  import('./a2ui_surface').then((m) => ({ default: m.A2UIRenderer }))
);

/**
 * Factory function that creates the A2UI surface attachment UI definition.
 * Renders A2UI declarative surfaces inline in the conversation using the
 * A2UI renderer, which maps component specs to EUI components.
 */
export const createA2UISurfaceAttachmentDefinition =
  (): AttachmentUIDefinition<A2UISurfaceAttachment> => {
    return {
      getLabel: (attachment) =>
        attachment.data.title ??
        i18n.translate('xpack.agentBuilder.attachments.a2uiSurface.label', {
          defaultMessage: 'UI Surface',
        }),
      getIcon: () => 'grid',
      renderInlineContent: ({ attachment }) => {
        return (
          <Suspense fallback={<EuiLoadingSpinner />}>
            <LazyA2UIRenderer surface={attachment.data} />
          </Suspense>
        );
      },
    };
  };
