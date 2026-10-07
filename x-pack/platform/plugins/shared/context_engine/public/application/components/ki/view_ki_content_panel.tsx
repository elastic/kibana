/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { viewKiLoadingPanelCss } from './view_ki_loading_layout';

interface ViewKiContentPanelProps {
  document?: KiDocument;
  isLoading?: boolean;
}

export const ViewKiContentPanel = ({
  document,
  isLoading = false,
}: ViewKiContentPanelProps) => {
  const contentValue = document?.content ?? '';
  const hasContent = contentValue.length > 0;

  if (isLoading) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        data-test-subj="contextViewKiContentPanel"
      >
        <EuiPanel
          hasBorder
          paddingSize="l"
          css={viewKiLoadingPanelCss}
          data-test-subj="contextViewKiContentLoading"
        >
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      justifyContent={hasContent ? 'flexStart' : 'center'}
      data-test-subj="contextViewKiContentPanel"
    >
      {hasContent ? (
        <EuiPanel hasBorder paddingSize="l" data-test-subj="contextViewKiContent">
          <div data-test-subj="contextViewKiMarkdownRendered">
            <EuiMarkdownFormat textSize="s">{contentValue}</EuiMarkdownFormat>
          </div>
        </EuiPanel>
      ) : (
        <EuiEmptyPrompt
          iconType="document"
          titleSize="xs"
          data-test-subj="contextViewKiContentEmpty"
          body={
            <p>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.content.empty"
                defaultMessage="No content"
              />
            </p>
          }
        />
      )}
    </EuiFlexGroup>
  );
};
