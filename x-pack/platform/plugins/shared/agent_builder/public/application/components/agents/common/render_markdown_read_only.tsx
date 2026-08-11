/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiTitle,
} from '@elastic/eui';
import { labels } from '../../../utils/i18n';

const viewToggleOptions = [
  {
    id: 'rendered',
    label: labels.common.markdownViewRenderedLabel,
    iconType: 'eye',
  },
  {
    id: 'raw',
    label: labels.common.markdownViewRawLabel,
    iconType: 'code',
  },
];

interface RenderMarkdownReadOnlyProps {
  content: string;
  label?: string;
}

export const RenderMarkdownReadOnly: React.FC<RenderMarkdownReadOnlyProps> = ({
  content,
  label,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            {label && (
              <EuiTitle size="xs">
                <h4>{label}</h4>
              </EuiTitle>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={labels.common.markdownViewModeLegend}
              options={viewToggleOptions}
              idSelected={showRaw ? 'raw' : 'rendered'}
              onChange={(id) => setShowRaw(id === 'raw')}
              isIconOnly
              buttonSize="compressed"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {showRaw ? (
          <EuiCodeBlock language="markdown" lineNumbers transparentBackground paddingSize="none">
            {content}
          </EuiCodeBlock>
        ) : (
          <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
