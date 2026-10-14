/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { OsqueryAttachmentPayload } from '../../../common/cases/attachments/schema';
import { useKibana } from '../../common/lib/kibana';
import type { ServicesWrapperProps } from '../services_wrapper';
import ServicesWrapper from '../services_wrapper';
import { EmptyPrompt } from '../../routes/components/empty_prompt';

type Props = UnifiedReferenceAttachmentViewProps<
  OsqueryAttachmentPayload['metadata'],
  OsqueryAttachmentPayload['attachmentId']
>;

// `defineAttachment.children` expects a `LazyExoticComponent`, so the auth-gated
// wrapper is itself produced lazily; cases wraps `children` in <Suspense> on render.
export const getLazyContent = (services: ServicesWrapperProps['services']) =>
  lazy<React.FC<Props>>(async () => {
    const { default: AttachmentContent } = await import('./content');

    const Wrapped: React.FC<Props> = (props) => {
      const {
        services: {
          application: {
            capabilities: { osquery },
          },
        },
      } = useKibana();

      if (!osquery.read) {
        return <EmptyPrompt />;
      }

      return (
        <ServicesWrapper services={services}>
          <AttachmentContent {...props} />
        </ServicesWrapper>
      );
    };

    return { default: Wrapped };
  });
