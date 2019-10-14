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
  const ScreenshotsContainer = styled.div`
    background: linear-gradient(360deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%),
      ${theme.eui.euiColorPrimary};
    padding: 54px 64px;
    border-radius: 4px;
  `;
  const ImageCaptionContainer = styled(EuiFlexItem)`
    margin: 0;
  `;
  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Screenshots</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ScreenshotsContainer>
        <EuiFlexGroup direction="column" alignItems="center">
          <ImageCaptionContainer>
            <EuiText color="ghost">
              We need image descriptions to be returned in the response
            </EuiText>
            <EuiSpacer />
          </ImageCaptionContainer>
          <EuiFlexItem>
            <EuiImage url={src} alt="image" size="l" allowFullScreen />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ScreenshotsContainer>
    </Fragment>
  );
}
