/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useCustomPanelShimmer } from './loaders/use_custom_panel_shimmer';
import { MotionLoader } from './loaders/motion_loader';
import { ShimmeringText } from './shimmering_text';

const GENERATING_LOADER_SIZE = 16;

export const CustomContentGeneratingPrompt = () => {
  const { euiTheme } = useEuiTheme();
  const statusFontSize = useEuiFontSize('s');
  const shimmer = useCustomPanelShimmer();
  const title = i18n.translate('xpack.customContent.generating.title', {
    defaultMessage: 'Generating your panel...',
  });

  return (
    <div
      css={css({
        position: 'absolute',
        inset: 0,
        zIndex: euiTheme.levels.header,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: euiTheme.size.l,
        backgroundColor: euiTheme.colors.emptyShade,
      })}
      data-test-subj="customContentGeneratingPrompt"
      role="status"
      aria-live="polite"
    >
      <MotionLoader scenario="customPanel" size={GENERATING_LOADER_SIZE} decorative />
      <EuiSpacer size="s" />
      <span
        css={css`
          ${statusFontSize}
          color: ${euiTheme.colors.textDisabled};
        `}
      >
        <ShimmeringText text={title} enabled={shimmer} />
      </span>
    </div>
  );
};
