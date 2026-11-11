/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiMarkdownFormat, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface ViewKiContentPanelProps {
  content: string;
}

export const ViewKiContentPanel = ({ content }: ViewKiContentPanelProps) => {
  const hasContent = content.length > 0;

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
            <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
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
