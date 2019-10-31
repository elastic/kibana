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
  const image = images[0];
  const hasCaption = image.title ? true : false;

  const horizontalPadding: number = parseInt(theme.eui.paddingSizes.xl, 10) * 2;
  const verticalPadding: number = parseInt(theme.eui.paddingSizes.xl, 10) * 1.75;
  const padding = hasCaption
    ? `${theme.eui.paddingSizes.xl} ${horizontalPadding}px ${verticalPadding}px`
    : `${verticalPadding}px ${horizontalPadding}px`;

  const ScreenshotsContainer = styled(EuiFlexGroup)`
    background: linear-gradient(360deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%),
      ${theme.eui.euiColorPrimary};
    padding: ${padding};
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
        {hasCaption && (
          <NestedEuiFlexItem>
            <EuiText color="ghost" aria-label="screenshot image caption">
              {image.title}
            </EuiText>
            <EuiSpacer />
          </NestedEuiFlexItem>
        )}
        <NestedEuiFlexItem>
          {/* by default EuiImage sets width to 100% and Figure to 22.5rem for large images,
              set image to same width
            */}
          <EuiImage
            url={toImage(image.src)}
            alt="screenshot image preview"
            size="l"
            allowFullScreen
            style={{ width: '22.5rem' }}
          />
        </NestedEuiFlexItem>
      </ScreenshotsContainer>
    </Fragment>
  );
}
