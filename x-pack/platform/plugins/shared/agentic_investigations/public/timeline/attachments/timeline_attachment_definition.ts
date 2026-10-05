/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_ATTACHMENT_TYPE } from '../../../common/timeline/constants';
import type { InvestigationTimeline } from '../../../common/timeline/timeline';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';
import { TIMELINE_LABEL } from './translations';

/** Browser UI for the investigation_timeline attachment; the content loads on first render. */
export const timelineAttachmentRenderer: InvestigationAttachmentRenderer<InvestigationTimeline> & {
  type: typeof TIMELINE_ATTACHMENT_TYPE;
} = {
  type: TIMELINE_ATTACHMENT_TYPE,
  getLabel: () => TIMELINE_LABEL,
  icon: 'calendar',
  loadContent: () => import('./timeline_view').then(({ TimelineView }) => TimelineView),
};
