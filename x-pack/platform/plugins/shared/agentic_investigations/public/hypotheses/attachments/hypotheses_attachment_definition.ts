/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HYPOTHESES_ATTACHMENT_TYPE } from '../../../common/hypotheses/constants';
import type { InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';
import { HYPOTHESES_LABEL } from './translations';

/** Browser UI for the investigation_hypotheses attachment; the content loads on first render. */
export const hypothesesAttachmentRenderer: InvestigationAttachmentRenderer<InvestigationHypotheses> & {
  type: typeof HYPOTHESES_ATTACHMENT_TYPE;
} = {
  type: HYPOTHESES_ATTACHMENT_TYPE,
  getLabel: () => HYPOTHESES_LABEL,
  icon: 'list',
  loadContent: () => import('./hypotheses_view').then(({ HypothesesView }) => HypothesesView),
};
