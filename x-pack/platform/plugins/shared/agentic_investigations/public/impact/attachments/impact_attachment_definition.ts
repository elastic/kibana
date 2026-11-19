/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';

/** Browser UI for the investigation_impact attachment; the content loads on first render. */
export const impactAttachmentRenderer: InvestigationAttachmentRenderer<Impact> & {
  type: typeof IMPACT_ATTACHMENT_TYPE;
} = {
  type: IMPACT_ATTACHMENT_TYPE,
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.impact.attachments.label', {
      defaultMessage: 'Impact',
    }),
  icon: 'warning',
  loadContent: () => import('./impact_view').then(({ ImpactView }) => ImpactView),
};
