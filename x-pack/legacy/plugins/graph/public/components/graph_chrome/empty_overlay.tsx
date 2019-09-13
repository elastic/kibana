/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface EmptyOverlayProps {
  onFillWorkspace: () => void;
}

export function EmptyOverlay({ onFillWorkspace }: EmptyOverlayProps) {
  return (
    <div className="gphWorkspaceOverlay">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText>
            <h1>
              {i18n.translate('xpack.graph.emptyOverlay.title', {
                defaultMessage: 'No data',
              })}
            </h1>
            <p>
              {i18n.translate('xpack.graph.emptyOverlay.description', {
                defaultMessage:
                  'Search for something you are interested in the search bar above or',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton fill onClick={onFillWorkspace}>
            {i18n.translate('xpack.graph.emptyOverlay.callToActionLabel', {
              defaultMessage: 'Show top terms and correlations between them',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
