/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiPageHeaderSection, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEvaluations } from '../../../context/evaluations/evaluations_context';

export const HeaderLeftActions: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { showThinking, setShowThinking } = useEvaluations();

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
    justify-self: end;
  `;

  const labels = {
    container: i18n.translate('xpack.onechat.conversationActions.container', {
      defaultMessage: 'Header actions',
    }),
    showThinking: i18n.translate('xpack.onechat.evaluations.showThinking', {
      defaultMessage: 'Show Thinking',
    }),
  };

  const handleShowThinkingChange = (e: EuiSwitchEvent) => {
    setShowThinking(e.target.checked);
  };

  return (
    <EuiPageHeaderSection css={actionsContainerStyles} aria-label={labels.container}>
      <EuiSwitch
        label={labels.showThinking}
        checked={showThinking}
        onChange={handleShowThinkingChange}
      />
    </EuiPageHeaderSection>
  );
};
