/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IMPACT_MAP_ATTACHMENT_TYPE,
  TIMELINE_ATTACHMENT_TYPE,
} from '../../../common/impact_map/constants';
import type { InvestigationImpactMap } from '../../../common/impact_map/impact_map';
import type { ImpactMapRenderer } from '../../types';
import type { InvestigationTab } from './impact_map_cards';
import type { InvestigationAttachmentRenderer } from '../../investigation_attachments';

/**
 * Browser UI for the investigation_impact_map attachment: cards for the map, the timeline and the
 * key entities. The map is drawn by the renderer a solution registered, read when a card opens.
 */
export const createImpactMapAttachmentRenderer = (
  getImpactMapRenderer: () => ImpactMapRenderer | undefined,
  openInInvestigation: (conversationId: string, tab: InvestigationTab) => void
): InvestigationAttachmentRenderer<InvestigationImpactMap> & {
  type: typeof IMPACT_MAP_ATTACHMENT_TYPE;
} => ({
  type: IMPACT_MAP_ATTACHMENT_TYPE,
  getLabel: ({ title }) =>
    title?.trim() ||
    i18n.translate('xpack.agenticInvestigations.impactMap.attachments.label', {
      defaultMessage: 'Impact map',
    }),
  icon: 'graphApp',
  loadContent: () =>
    import('./impact_map_cards').then(({ createImpactMapCards }) =>
      createImpactMapCards(getImpactMapRenderer, openInInvestigation)
    ),
});

/** Browser UI for the investigation_timeline attachment: the timeline card on its own. */
export const createTimelineAttachmentRenderer = (
  openInInvestigation: (conversationId: string, tab: InvestigationTab) => void
): InvestigationAttachmentRenderer<{ conversationId: string }> & {
  type: typeof TIMELINE_ATTACHMENT_TYPE;
} => ({
  type: TIMELINE_ATTACHMENT_TYPE,
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.impactMap.attachments.timelineLabel', {
      defaultMessage: 'Timeline',
    }),
  icon: 'clock',
  loadContent: () =>
    import('./impact_map_cards').then(({ createTimelineCards }) =>
      createTimelineCards(openInInvestigation)
    ),
});
