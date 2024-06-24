/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { KnowledgeBaseConfig } from '../assistant/types';
import { ESQL_RESOURCE } from './const';
import * as i18n from './translations';

interface Props {
  compressed: boolean;
  enableKnowledgeBaseByDefault: boolean;
  isEnabledKnowledgeBase: boolean;
  isLoadingKb: boolean;
  isSwitchDisabled: boolean;
  kbStatusElserExists: boolean;
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setupKB: (resource: string) => void;
  showLabel?: boolean;
}

export const KnowledgeBaseToggle: React.FC<Props> = React.memo(
  ({
    compressed,
    enableKnowledgeBaseByDefault,
    isEnabledKnowledgeBase,
    isLoadingKb,
    isSwitchDisabled,
    kbStatusElserExists,
    knowledgeBase,
    setUpdatedKnowledgeBaseSettings,
    setupKB,
    showLabel,
  }) => {
    const { euiTheme } = useEuiTheme();
    //////////////////////////////////////////////////////////////////////////////////////////
    // Main `Knowledge Base` switch, which toggles the `isEnabledKnowledgeBase` UI feature toggle
    // setting that is saved to localstorage
    const onEnableAssistantLangChainChange = useCallback(
      (event: EuiSwitchEvent) => {
        setUpdatedKnowledgeBaseSettings({
          ...knowledgeBase,
          isEnabledKnowledgeBase: event.target.checked,
        });

        // If enabling and ELSER exists or automatic KB setup FF is enabled, try to set up automatically
        if (event.target.checked && (enableKnowledgeBaseByDefault || kbStatusElserExists)) {
          setupKB(ESQL_RESOURCE);
        }
      },
      [
        enableKnowledgeBaseByDefault,
        kbStatusElserExists,
        knowledgeBase,
        setUpdatedKnowledgeBaseSettings,
        setupKB,
      ]
    );
    return isLoadingKb ? (
      <EuiLoadingSpinner size="s" />
    ) : (
      <EuiFormRow fullWidth display={compressed ? 'rowCompressed' : 'row'}>
        <EuiToolTip content={isSwitchDisabled && i18n.KNOWLEDGE_BASE_TOOLTIP} position={'right'}>
          <EuiSwitch
            showLabel={showLabel}
            data-test-subj="isEnabledKnowledgeBaseSwitch"
            disabled={isSwitchDisabled}
            checked={isEnabledKnowledgeBase}
            onChange={onEnableAssistantLangChainChange}
            label={
              compressed ? (
                <></>
              ) : (
                <EuiTitle size="xs">
                  <h3>{i18n.KNOWLEDGE_BASE_LABEL}</h3>
                </EuiTitle>
              )
            }
            compressed={compressed}
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
        </EuiToolTip>
      </EuiFormRow>
    );
  }
);

KnowledgeBaseToggle.displayName = 'KnowledgeBaseToggle';
