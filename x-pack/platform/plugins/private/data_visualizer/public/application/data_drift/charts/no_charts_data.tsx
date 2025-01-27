/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, type EuiTextProps } from '@elastic/eui';
import React from 'react';

export const NoChartsData = ({ textAlign }: { textAlign?: EuiTextProps['textAlign'] }) => {
  return (
    <EuiText
      color="subdued"
      textAlign={textAlign ?? 'center'}
      size={'s'}
      css={{
        display: 'flex',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        alignItems: 'center',
      }}
    >
      <FormattedMessage id="xpack.dataVisualizer.noData" defaultMessage="No data" />
    </EuiText>
  );
};
