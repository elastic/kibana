/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useCallback } from 'react';
import { KnowledgeBaseConfig } from '../assistant/types';
import { SEND_ALERTS_LABEL } from './translations';

interface Props {
  compressed?: boolean;
  isEnabledRAGAlerts: boolean;
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  showLabel?: boolean;
}
const LABEL_WRAPPER_MIN_WIDTH = 95; // px

export const AlertsSwitch: React.FC<Props> = React.memo(
  ({
    isEnabledRAGAlerts,
    compressed = true,
    setUpdatedKnowledgeBaseSettings,
    knowledgeBase,
    showLabel,
  }) => {
    const { euiTheme } = useEuiTheme();

    const onEnableAlertsChange = useCallback(
      (event: EuiSwitchEvent) => {
        setUpdatedKnowledgeBaseSettings({
          ...knowledgeBase,
          // isEnabledRAGAlerts: event.target.checked,
        });
      },
      [knowledgeBase, setUpdatedKnowledgeBaseSettings]
    );
    return (
      <EuiFormRow
        display={compressed ? 'columnCompressedSwitch' : 'row'}
        css={css`
          .euiFormRow__labelWrapper {
            min-width: ${LABEL_WRAPPER_MIN_WIDTH}px !important;
          }
        `}
      >
        <EuiSwitch
          checked={isEnabledRAGAlerts}
          compressed={compressed}
          data-test-subj="alertsSwitch"
          label={<EuiText size="s">{SEND_ALERTS_LABEL}</EuiText>}
          onChange={onEnableAlertsChange}
          showLabel={showLabel}
          labelProps={
            compressed
              ? {}
              : {
                  style: {
                    paddingLeft: euiTheme.size.base,
                  },
                }
          }
        />
      </EuiFormRow>
    );
  }
);
AlertsSwitch.displayName = 'AlertsSwitch';
