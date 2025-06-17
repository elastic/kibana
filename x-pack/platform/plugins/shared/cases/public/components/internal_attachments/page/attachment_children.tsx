/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiImage,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import type { PageAttachmentPersistedState } from './types';

interface AttachmentChildrenProps {
  persistableStateAttachmentState: PageAttachmentPersistedState;
}

const base64ToImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const stitchBase64ImagesVertically = async (base64Slices: string[]): Promise<string> => {
  const images = await Promise.all(base64Slices.map(base64ToImage));

  const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
  const width = images[0]?.width || 0;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  let y = 0;

  if (ctx) {
    for (const img of images) {
      ctx.drawImage(img, 0, y);
      y += img.height;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.8);
};

export const PageAttachmentChildren: React.FC<AttachmentChildrenProps> = ({
  persistableStateAttachmentState,
}) => {
  const { url, snapshot } = persistableStateAttachmentState;
  const [screenshot, setScreenshot] = useState<string | null>(null);

  useEffect(() => {
    async function stitchImgData() {
      if (snapshot && snapshot.imgData) {
        const stitchedBase64 = await stitchBase64ImagesVertically(snapshot.imgData);
        setScreenshot(stitchedBase64);
      }
    }

    stitchImgData();
  }, [snapshot]);

  if (!url) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.cases.caseView.pageAttachment.noUrlProvidedTitle', {
          defaultMessage: 'No URL provided',
        })}
        color="danger"
        iconType="alert"
      >
        <EuiText>
          <p>
            {i18n.translate('xpack.cases.caseView.pageAttachment.noUrlProvided', {
              defaultMessage: 'This page attachment does not contain a valid URL.',
            })}
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }
  const href = url.pathAndQuery || '';
  const label = url.label;

  if (screenshot === null) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={persistableStateAttachmentState.url.iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={href}>
            <EuiText size="m">{label}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {snapshot?.imgData && (
        <>
          <EuiSpacer size="m" />
          <EuiImage key="screenshot" src={screenshot} alt="screenshot" allowFullScreen />
        </>
      )}
    </>
  );
};

PageAttachmentChildren.displayName = 'PageAttachmentChildren';

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default PageAttachmentChildren;
