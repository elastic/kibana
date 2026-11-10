/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentErrorBoundary } from './attachment_error_boundary';
import { GroupedAttachmentList } from './grouped_attachment_list';
import { selectGroupedAttachments } from './select_grouped_attachments';
import type { FlyoutGroupedAttachments, FlyoutGroupedAttachmentsRegistry } from './types';

export interface GroupedAttachmentsSectionProps {
  attachments: VersionedAttachment[] | undefined;
  registry: FlyoutGroupedAttachmentsRegistry;
  order: readonly FlyoutGroupedAttachments[];
}

/** One card holding the rows of every registered group that has attachments, in `order`. */
export const GroupedAttachmentsSection = memo<GroupedAttachmentsSectionProps>(
  ({ attachments, registry, order }) => {
    const { euiTheme } = useEuiTheme();

    const groups = useMemo(
      () => selectGroupedAttachments(attachments, registry, order),
      [attachments, registry, order]
    );

    if (groups.length === 0) {
      return null;
    }

    return (
      <GroupedAttachmentList
        data-test-subj="groupedAttachmentsSection"
        css={css({ marginTop: euiTheme.size.s })}
      >
        {groups.map(({ group, renderer: Renderer, attachments: groupAttachments }) => (
          <AttachmentErrorBoundary key={group}>
            <Suspense
              fallback={
                <li css={css({ padding: `12px ${euiTheme.size.base}` })}>
                  <EuiSkeletonText lines={1} />
                </li>
              }
            >
              <Renderer attachments={groupAttachments} />
            </Suspense>
          </AttachmentErrorBoundary>
        ))}
      </GroupedAttachmentList>
    );
  }
);

GroupedAttachmentsSection.displayName = 'GroupedAttachmentsSection';
