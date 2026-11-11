/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  euiTextTruncate,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useObjectUrl } from './use_object_url';

const labels = {
  download: i18n.translate('xpack.agentBuilder.imagePreviewModal.download', {
    defaultMessage: 'Download',
  }),
  openFullScreen: i18n.translate('xpack.agentBuilder.imagePreviewModal.openFullScreen', {
    defaultMessage: 'Open full screen',
  }),
};

const titleStyles = css`
  ${euiTextTruncate()}
  min-inline-size: 0;
`;

const imageStyles = css`
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
`;

export interface ImagePreviewModalProps {
  src: string;
  label: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, label, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'agentBuilderImagePreviewTitle' });
  const objectUrl = useObjectUrl(src);

  return (
    <EuiModal
      onClose={onClose}
      outsideClickCloses
      aria-labelledby={titleId}
      data-test-subj="agentBuilderImagePreviewModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} title={label} css={titleStyles}>
          {label}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <img src={src} alt={label} css={imageStyles} />
      </EuiModalBody>
      {objectUrl && (
        <EuiModalFooter>
          <EuiButtonEmpty
            iconType="download"
            href={objectUrl}
            download={label}
            data-test-subj="agentBuilderImagePreviewDownload"
          >
            {labels.download}
          </EuiButtonEmpty>
          <EuiButtonEmpty
            iconType="fullScreen"
            href={objectUrl}
            target="_blank"
            data-test-subj="agentBuilderImagePreviewOpenFullScreen"
          >
            {labels.openFullScreen}
          </EuiButtonEmpty>
        </EuiModalFooter>
      )}
    </EuiModal>
  );
};
