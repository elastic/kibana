/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRACE_ATTACHMENT_TYPE } from '../../../common/trace/constants';
import type { InvestigationTrace } from '../../../common/trace/trace';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';
import { TRACE_LABEL } from './translations';

/** Browser UI for the investigation_trace attachment; the content loads on first render. */
export const traceAttachmentRenderer: InvestigationAttachmentRenderer<InvestigationTrace> & {
  type: typeof TRACE_ATTACHMENT_TYPE;
} = {
  type: TRACE_ATTACHMENT_TYPE,
  getLabel: () => TRACE_LABEL,
  icon: 'branch',
  loadContent: () => import('./trace_view').then(({ TraceView }) => TraceView),
};
