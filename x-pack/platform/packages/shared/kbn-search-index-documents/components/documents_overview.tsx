/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent } from 'react';
import { css } from '@emotion/react';

interface DocumentsProps {
  accessControlSwitch?: React.ReactNode;
  dataTelemetryIdPrefix: string;
  documentComponent: React.ReactNode;
  searchQueryCallback: (searchQuery: string) => void;
}
export const DocumentsOverview: React.FC<DocumentsProps> = ({
  accessControlSwitch,
  dataTelemetryIdPrefix,
  documentComponent,
  searchQueryCallback,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            {accessControlSwitch && (
              <EuiFlexItem
                css={css`
                  min-width: ${euiTheme.base * 18}px;
                `}
                grow={false}
              >
                {accessControlSwitch}
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFieldSearch
                data-telemetry-id={`${dataTelemetryIdPrefix}-documents-searchDocuments`}
                placeholder={i18n.translate(
                  'xpack.searchIndexDocuments.documents.searchField.placeholder',
                  {
                    defaultMessage: 'Search documents in this index',
                  }
                )}
                isClearable
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  searchQueryCallback(event.target.value)
                }
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>{documentComponent}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
