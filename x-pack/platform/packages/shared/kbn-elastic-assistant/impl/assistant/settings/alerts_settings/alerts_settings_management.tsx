/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { KnowledgeBaseConfig } from '../../types';
import { AlertsRange } from '../../../knowledge_base/alerts_range';
import * as i18n from '../../../knowledge_base/translations';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  hasBorder?: boolean;
}

/**
 * Replaces the AlertsSettings component used in the existing settings modal. Once the modal is
 * fully removed we can delete that component in favor of this one.
 */
export const AlertsSettingsManagement: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings, hasBorder = true }) => {
    return (
      <EuiPanel hasShadow={false} hasBorder={hasBorder} paddingSize="l" title={i18n.ALERTS_LABEL}>
        <EuiTitle size="m">
          <h3>{i18n.ALERTS_LABEL}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="m">
          <span>
            {i18n.LATEST_AND_RISKIEST_OPEN_ALERTS(knowledgeBase.latestAlerts)}
            {i18n.YOUR_ANONYMIZATION_SETTINGS}
          </span>
        </EuiText>
        <EuiSpacer size="l" />
        <AlertsRange
          knowledgeBase={knowledgeBase}
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
          compressed={false}
          value={knowledgeBase.latestAlerts}
        />
      </EuiPanel>
    );
  }
);

AlertsSettingsManagement.displayName = 'AlertsSettingsManagement';
