/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPortal } from '@elastic/eui';
import React from 'react';

import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';

// portal the fixed background graphic so it doesn't affect page positioning or overlap on top of global banners
export const BackgroundPortal = React.memo(function BackgroundPortal() {
  const kbnFullScreenBgCss = useKbnFullScreenBgCss();
  return (
    <EuiPortal>
      <div
        className="spcSelectorBackground spcSelectorBackground__nonMixinAttributes"
        css={kbnFullScreenBgCss}
        role="presentation"
      />
    </EuiPortal>
  );
});
