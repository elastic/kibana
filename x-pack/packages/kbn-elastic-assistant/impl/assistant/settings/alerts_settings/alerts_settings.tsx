/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { KnowledgeBaseConfig } from '../../types';
import { AlertsRange } from '../../../knowledge_base/alerts_range';
import * as i18n from '../../../knowledge_base/translations';

export const MIN_LATEST_ALERTS = 50;
export const MAX_LATEST_ALERTS = 500;
export const TICK_INTERVAL = 50;
export const RANGE_CONTAINER_WIDTH = 600; // px

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

const AlertsSettingsComponent = ({ knowledgeBase, setUpdatedKnowledgeBaseSettings }: Props) => {
  return (
    <>
      <EuiSpacer size="s" />

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <p>
            <EuiText color="subdued" size="s" component="span">
              {i18n.LATEST_AND_RISKIEST_OPEN_ALERTS(knowledgeBase.latestAlerts)}
            </EuiText>{' '}
            <EuiText color="subdued" size="s" component="span">
              {i18n.YOUR_ANONYMIZATION_SETTINGS}
            </EuiText>{' '}
            <EuiText color="subdued" size="s" component="span">
              {i18n.SELECT_FEWER_ALERTS}
            </EuiText>
          </p>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSpacer size="xs" />
          <AlertsRange
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const AlertsSettings = React.memo(AlertsSettingsComponent);
