/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiText, EuiTitle, EuiImage, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { ScreenshotItem } from '../../../common/types';
import { useLinks, useCore } from '../../hooks';

interface ScreenshotProps {
  images: ScreenshotItem[];
}

export function Screenshots(props: ScreenshotProps) {
  const { theme } = useCore();
  const { toImage } = useLinks();
  const { images } = props;

  // for now, just get first image
  const src = toImage(images[0].src);

  const horizontalPadding: number = parseInt(theme.eui.paddingSizes.xl, 10) * 2;
  const bottomPadding: number = parseInt(theme.eui.paddingSizes.xl, 10) * 1.75;

  const ScreenshotsContainer = styled(EuiFlexGroup)`
    background: linear-gradient(360deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%),
      ${theme.eui.euiColorPrimary};
    padding: ${theme.eui.paddingSizes.xl} ${horizontalPadding}px ${bottomPadding}px;
    flex: 0 0 auto;
    border-radius: ${theme.eui.euiBorderRadius};
  `;
  // fixes ie11 problems with nested flex items
  const NestedEuiFlexItem = styled(EuiFlexItem)`
    flex: 0 0 auto !important;
  `;
  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Screenshots</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ScreenshotsContainer gutterSize="none" direction="column" alignItems="center">
        <NestedEuiFlexItem>
          <EuiText color="ghost">We need image descriptions to be returned in the response</EuiText>
          <EuiSpacer />
        </NestedEuiFlexItem>
        <NestedEuiFlexItem>
          <EuiImage url={src} alt="image" size="l" allowFullScreen />
        </NestedEuiFlexItem>
      </ScreenshotsContainer>
    </Fragment>
  );
}
