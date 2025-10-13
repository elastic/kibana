/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeaderSection, EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export const HeaderRightActions: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

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
  };

  return (
    <EuiPageHeaderSection css={actionsContainerStyles} aria-label={labels.container}>
      <EuiButton
        fill
        size="m"
        onClick={() => {
          // TODO: Implement run evaluation functionality
          console.log('Run evaluation clicked');
        }}
      >
        {i18n.translate('xpack.onechat.evaluations.runEval', {
          defaultMessage: 'Run Evaluations',
        })}
      </EuiButton>
    </EuiPageHeaderSection>
  );
};
