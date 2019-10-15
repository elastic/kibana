/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, ButtonColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const AnalyzeInMlButton: React.FunctionComponent<{
  color?: ButtonColor;
  fill?: boolean;
  href: string;
}> = ({ color = 'primary', fill = true, href }) => {
  return (
    <EuiButton color={color} fill={fill} href={href}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.analyzeInMlButtonLabel"
        defaultMessage="Analyze in ML"
      />
    </EuiButton>
  );
};
