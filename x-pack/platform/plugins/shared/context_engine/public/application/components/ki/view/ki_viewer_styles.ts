/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const useKiViewerStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      panel: css({
        borderRadius: euiTheme.border.radius.panel,
      }),
      titleRow: css({
        gap: euiTheme.size.m,
        marginBottom: euiTheme.size.m,
      }),
      title: css({
        overflowWrap: 'anywhere',
      }),
      badgesRow: css({
        marginBottom: euiTheme.size.base,
      }),
      details: css({
        marginTop: euiTheme.size.base,
        paddingTop: euiTheme.size.m,
        borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      }),
      detailsTitle: css({
        fontWeight: euiTheme.font.weight.bold,
      }),
      actions: css({
        marginTop: euiTheme.size.l,
      }),
    }),
    [euiTheme]
  );
};
