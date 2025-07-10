/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { css } from '@emotion/react';
import { useEuiFontSize } from '@elastic/eui';
import { Markdown } from '@kbn/shared-ux-markdown';
import { BannerConfiguration } from '../../common';

interface BannerProps {
  bannerConfig: BannerConfiguration;
}

export const Banner: FC<BannerProps> = ({ bannerConfig }) => {
  const { textContent, textColor, linkColor, backgroundColor } = bannerConfig;
  const customLinkColor = linkColor || 'inherit';
  const bannerStyle = css({
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: useEuiFontSize('s').fontSize,
    backgroundColor,
    color: textColor,
    '& a': {
      color: customLinkColor,
    },
  });

  return (
    <div css={bannerStyle}>
      <div className="eui-textTruncate" data-test-subj="bannerInnerWrapper">
        <Markdown readOnly>{textContent}</Markdown>
      </div>
    </div>
  );
};
