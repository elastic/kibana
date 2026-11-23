/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KiViewer } from '../ki/view/ki_viewer';
import type { KiGraphNodeData } from './types';

const viewerFlyoutTitle = i18n.translate('xpack.contextEngine.kiGraph.viewerFlyoutTitle', {
  defaultMessage: 'Knowledge document',
});

interface KiGraphViewerFlyoutProps {
  aiIndexId: string;
  node: KiGraphNodeData;
  onClose: () => void;
}

export const KiGraphViewerFlyout = ({ aiIndexId, node, onClose }: KiGraphViewerFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'contextKiGraphViewerFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus={false}
      aria-labelledby={titleId}
      data-test-subj="contextKiGraphViewerFlyout"
    >
      <EuiFlyoutBody>
        <span id={titleId} className="euiScreenReaderOnly">
          {viewerFlyoutTitle}
        </span>
        <KiViewer
          key={`${node.index}:${node.kiId}`}
          aiIndexId={aiIndexId}
          selectedKi={{ kiId: node.kiId, index: node.index }}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
