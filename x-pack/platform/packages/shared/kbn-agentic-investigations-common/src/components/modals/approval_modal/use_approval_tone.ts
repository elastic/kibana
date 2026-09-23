/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface ApprovalToneTokens {
  headerBackground: string;
  avatarBackground: string;
  warningLabelColor: string;
  headerBorder: string;
}

export const useApprovalTone = (tone: 'primary' | 'danger'): ApprovalToneTokens => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    if (tone === 'danger') {
      return {
        headerBackground: euiTheme.colors.backgroundBaseDanger,
        headerBorder: euiTheme.colors.backgroundLightDanger,
        avatarBackground: euiTheme.colors.backgroundFilledDanger,
        warningLabelColor: euiTheme.colors.textDanger,
      };
    }
    return {
      headerBackground: euiTheme.colors.backgroundBasePrimary,
      headerBorder: euiTheme.colors.backgroundLightPrimary,
      avatarBackground: euiTheme.colors.backgroundFilledPrimary,
      warningLabelColor: euiTheme.colors.textPrimary,
    };
  }, [tone, euiTheme]);
};
