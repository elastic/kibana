/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { DataLifecycleMethod } from './types';

type EuiTheme = EuiThemeComputed;

export const getEditDataLifecycleFlyoutBodyContentStyles = ({
  euiTheme,
  showLifecycleMethodPicker,
  lifecycleMethod,
}: {
  euiTheme: EuiTheme;
  showLifecycleMethodPicker: boolean;
  lifecycleMethod: DataLifecycleMethod;
}) => ({
  headerSection: css`
    padding: ${euiTheme.size.l};
    ${showLifecycleMethodPicker && lifecycleMethod === 'ilm' ? 'padding-bottom: 0;' : ''}
  `,
  noInheritedPolicyPanel: css`
    margin: 0 ${euiTheme.size.l};
  `,
});
