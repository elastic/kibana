/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

export const EmbeddableNoResultsEmptyPrompt = () => (
  <div
    css={css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      flex: '1 0 100%',
      textAlign: 'center',
    })}
  >
    <EuiText size="xs" color="subdued">
      <EuiIcon type="visualizeApp" size="m" color="subdued" />
      <EuiSpacer size="m" />
      <FormattedMessage
        id="xpack.dataVisualizer.index.embeddableNoResultsMessage"
        defaultMessage="No results found"
      />
    </EuiText>
  </div>
);
