/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';

const comingSoonLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.overview.placeholder.comingSoon',
  {
    defaultMessage: 'Coming soon.',
  }
);

interface OverviewPlaceholderPanelProps {
  title: string;
  'data-test-subj'?: string;
}

/** Stands in for an Overview widget that is not built yet. */
export const OverviewPlaceholderPanel = ({
  title,
  'data-test-subj': dataTestSubj,
}: OverviewPlaceholderPanelProps) => (
  <EuiPanel hasBorder paddingSize="l" color="subdued" data-test-subj={dataTestSubj}>
    <EuiTitle size="s">
      <h2>{title}</h2>
    </EuiTitle>
    <AiIndexDetailPanelDescription>{comingSoonLabel}</AiIndexDetailPanelDescription>
  </EuiPanel>
);
