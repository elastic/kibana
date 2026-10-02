/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextTruncate } from '@elastic/eui';
import type { TitleSlotRenderProps } from '@kbn/agentic-investigations-common';
import { isInvestigationTitlePending } from '../../../common';
import { useInvestigation } from '../hooks/use_investigation';
import { getInvestigationDisplayTitle } from './investigation_display_title';
import { NEW_INVESTIGATION_TITLE } from './translations';

/**
 * The flyout header's title. Agent Builder titles an investigation on its first round; until then
 * the header names it after its first subject, read from the polled investigation.
 */
export const InvestigationTitle: React.FC<TitleSlotRenderProps> = ({ conversationId, title }) => {
  const { data } = useInvestigation(conversationId);
  const text = !isInvestigationTitlePending(title)
    ? title
    : data
    ? getInvestigationDisplayTitle(data)
    : NEW_INVESTIGATION_TITLE;

  return <EuiTextTruncate text={text} data-test-subj="investigationFlyoutTitle" />;
};
