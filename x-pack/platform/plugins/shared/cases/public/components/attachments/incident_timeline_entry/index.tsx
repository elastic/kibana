/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { IncidentTimelineEntryPayloadSchema } from '../../../../common/types/domain/attachment/incident_timeline_entry/v2';
import { AttachmentActionType, defineAttachment } from '../../../client/attachment_framework/types';
import * as i18n from '../../incident_timeline/translations';
import type { EntryViewProps } from './entry_activity';

const EntryActivityBodyLazy = React.lazy(() =>
  import('./entry_activity').then(({ EntryActivityBody }) => ({ default: EntryActivityBody }))
);

const EntryActivityActionsLazy = React.lazy(() =>
  import('./entry_activity').then(({ EntryActivityActions }) => ({
    default: EntryActivityActions,
  }))
);

/** The incident timeline entry type; registered only while the incident timeline flag is on. */
export const getIncidentTimelineEntryAttachmentType = () =>
  defineAttachment({
    id: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE,
    getIcon: () => 'flag',
    getLabel: () => i18n.ENTRY_LABEL,
    getCountLabel: ({ count }) => i18n.ENTRY_COUNT(count),
    getCreationActivity: () => ({
      event: i18n.ADDED_ENTRY,
      children: EntryActivityBodyLazy,
      getActions: (props: EntryViewProps) => [
        {
          type: AttachmentActionType.CUSTOM as const,
          isPrimary: true,
          render: () => (
            <React.Suspense fallback={null}>
              <EntryActivityActionsLazy
                entryId={props.savedObjectId}
                canUpdate={props.permissions.update}
              />
            </React.Suspense>
          ),
        },
      ],
    }),
    getRemovalActivity: () => ({ event: i18n.REMOVED_ENTRY }),
    schema: IncidentTimelineEntryPayloadSchema,
    workflowSchema: false,
  });
