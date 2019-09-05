/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';

type Props = React.ComponentProps<typeof EuiBadge> & {
  errorCount: number;
};

export const ErrorCountBadge = ({ errorCount = 0, ...rest }: Props) => (
  <EuiBadge color={euiThemeLight.euiColorDanger} {...rest}>
    {errorCount}
  </EuiBadge>
);
