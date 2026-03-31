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
  EuiPanel,
} from '@elastic/eui';
import { labels } from '../../../utils/i18n';

const viewToggleOptions = [
  {
    id: 'rendered',
    label: labels.agentSkills.instructionsViewRenderedLabel,
    iconType: 'eye',
  },
  {
    id: 'raw',
    label: labels.agentSkills.instructionsViewRawLabel,
    iconType: 'code',
  },
];

interface RenderSkillContentReadOnlyProps {
  content: string;
}

export const RenderSkillContentReadOnly: React.FC<RenderSkillContentReadOnlyProps> = ({
  content,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <EuiPanel borderRadius="m" hasBorder paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false} gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={labels.agentSkills.instructionsViewModeLegend}
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
    </EuiPanel>
  );
};
