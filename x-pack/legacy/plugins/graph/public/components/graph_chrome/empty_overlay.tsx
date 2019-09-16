/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface EmptyOverlayProps {
  onFillWorkspace: () => void;
}

export function EmptyOverlay({ onFillWorkspace }: EmptyOverlayProps) {
  return (
    <div className="gphWorkspaceOverlay">
      <EuiFlexGroup direction="column" className="gphWorkspaceOverlay__content">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <EuiIcon type="search" size="xl" />{' '}
              {i18n.translate('xpack.graph.emptyOverlay.title', {
                defaultMessage: 'What are you interested in?',
              })}
            </h1>
            <p>
              {i18n.translate('xpack.graph.emptyOverlay.description', {
                defaultMessage: 'Search for something you are interested in the search bar above.',
              })}
            </p>
            <p>
              {i18n.translate('xpack.graph.emptyOverlay.callToActionDescriotion', {
                defaultMessage: 'Alternatively you can also ',
              })}
              <br />
              <EuiButtonEmpty onClick={onFillWorkspace}>
                {i18n.translate('xpack.graph.emptyOverlay.callToActionLabel', {
                  defaultMessage: 'show top terms and correlations among them',
                })}
              </EuiButtonEmpty>
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
