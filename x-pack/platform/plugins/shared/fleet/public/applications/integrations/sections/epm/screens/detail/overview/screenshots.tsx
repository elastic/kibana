/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, memo, useRef, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiPagination,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';

import type { RegistryImage, PackageSpecScreenshot } from '../../../../../../../../common/types';
import { useLinks } from '../../../../../hooks';

type ScreenshotItem = RegistryImage | PackageSpecScreenshot;
interface ScreenshotProps {
  images: ScreenshotItem[];
  packageName: string;
  version: string;
}
const Pagination = styled(EuiPagination)`
  max-width: 130px;
`;

const ImageContainer = styled.div`
  container-type: inline-size;
`;

const ImageClip = styled.div<{ isCollapsed: boolean; backgroundColor: string }>`
  ${({ isCollapsed, backgroundColor }) =>
    isCollapsed
      ? `
    max-height: 150cqw;
    overflow: hidden;
    position: relative;
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, transparent, ${backgroundColor});
      pointer-events: none;
      z-index: 1;
    }
  `
      : ''}
`;

export const Screenshots: React.FC<ScreenshotProps> = memo(({ images, packageName, version }) => {
  const { toPackageImage } = useLinks();
  const { euiTheme } = useEuiTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const clipRef = useRef<HTMLDivElement>(null);
  const maxImageIndex = useMemo(() => images.length - 1, [images.length]);
  const currentImageUrl = useMemo(
    () => toPackageImage(images[currentImageIndex], packageName, version),
    [currentImageIndex, images, packageName, toPackageImage, version]
  );

  const checkOverflow = () => {
    const el = clipRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  };

  useLayoutEffect(() => {
    checkOverflow();
  }, [currentImageIndex, currentImageUrl]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {/* Title with carousel navigation */}
      <EuiFlexItem>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          gutterSize="xs"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.fleet.epm.screenshotsTitle"
                  defaultMessage="Screenshots"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Pagination
              aria-label={i18n.translate('xpack.fleet.epm.screenshotPaginationAriaLabel', {
                defaultMessage: '{packageName} screenshot pagination',
                values: {
                  packageName,
                },
              })}
              pageCount={maxImageIndex + 1}
              activePage={currentImageIndex}
              onPageClick={(activePage) => setCurrentImageIndex(activePage)}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Current screenshot */}
      <EuiFlexItem>
        <ImageContainer>
          <ImageClip
            ref={clipRef}
            isCollapsed={!isExpanded && isOverflowing}
            backgroundColor={euiTheme.colors.emptyShade}
          >
            {currentImageUrl ? (
              <EuiImage
                allowFullScreen
                hasShadow
                size="fullWidth"
                onLoad={checkOverflow}
                alt={
                  images[currentImageIndex].title ||
                  i18n.translate('xpack.fleet.epm.screenshotAltText', {
                    defaultMessage: '{packageName} screenshot #{imageNumber}',
                    values: {
                      packageName,
                      imageNumber: currentImageIndex + 1,
                    },
                  })
                }
                title={images[currentImageIndex].title}
                url={currentImageUrl}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.epm.screenshotErrorText"
                defaultMessage="Unable to load this screenshot"
              />
            )}
          </ImageClip>
        </ImageContainer>
      </EuiFlexItem>

      {isOverflowing && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? (
              <FormattedMessage
                id="xpack.fleet.epm.screenshotsShowLess"
                defaultMessage="Show less"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.epm.screenshotsShowMore"
                defaultMessage="Show more"
              />
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
