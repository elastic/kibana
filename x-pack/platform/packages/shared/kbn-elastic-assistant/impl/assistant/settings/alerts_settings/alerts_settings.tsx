/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFormRow, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { KnowledgeBaseConfig } from '../../types';
import { AlertsRange } from '../../../knowledge_base/alerts_range';
import * as i18n from '../../../knowledge_base/translations';

export const MIN_LATEST_ALERTS = 50;
export const MAX_LATEST_ALERTS = 500;
export const TICK_INTERVAL = 50;
export const RANGE_CONTAINER_WIDTH = 600; // px
const LABEL_WRAPPER_MIN_WIDTH = 95; // px

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

const AlertsSettingsComponent = ({ knowledgeBase, setUpdatedKnowledgeBaseSettings }: Props) => {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.ALERTS_LABEL}
        css={css`
          .euiFormRow__labelWrapper {
            min-width: ${LABEL_WRAPPER_MIN_WIDTH}px !important;
          }
        `}
      >
        <></>
      </EuiFormRow>

      <EuiSpacer size="xs" />

      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem
          css={css`
            width: ${RANGE_CONTAINER_WIDTH}px;
          `}
          grow={false}
        >
          <EuiSpacer size="xs" />
          <AlertsRange
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
            value={knowledgeBase.latestAlerts}
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <span>{i18n.LATEST_AND_RISKIEST_OPEN_ALERTS(knowledgeBase.latestAlerts)}</span>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <span>{i18n.YOUR_ANONYMIZATION_SETTINGS}</span>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <span>{i18n.SELECT_FEWER_ALERTS}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const AlertsSettings = React.memo(AlertsSettingsComponent);
