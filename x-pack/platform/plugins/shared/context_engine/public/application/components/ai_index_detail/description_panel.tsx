/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSkeletonText, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface DescriptionPanelProps {
  isLoading: boolean;
  description?: string;
}

export const DescriptionPanel = ({ isLoading, description }: DescriptionPanelProps) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.description.title"
          defaultMessage="Description"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    {isLoading ? (
      <EuiSkeletonText lines={2} />
    ) : (
      <EuiText size="s" color={description ? undefined : 'subdued'}>
        <p>
          {description ?? (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.description.empty"
              defaultMessage="No sources yet — add a source and a summary will be generated automatically."
            />
          )}
        </p>
      </EuiText>
    )}
  </EuiPanel>
);
