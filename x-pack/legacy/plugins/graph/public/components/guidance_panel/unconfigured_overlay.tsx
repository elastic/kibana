/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface UnconfiguredOverlayProps {
  onSelectFieldsClicked: () => void;
}

export function UnconfiguredOverlay({ onSelectFieldsClicked }: UnconfiguredOverlayProps) {
  return (
    <div className="gphWorkspaceOverlay">
      <EuiFlexGroup direction="column" className="gphWorkspaceOverlay__content">
        <EuiFlexItem>
          <EuiText>
            <h1>
              {i18n.translate('xpack.graph.unconfiguredOverlay.title', {
                defaultMessage: 'No fields to explore',
              })}
            </h1>
            <p>
              {i18n.translate('xpack.graph.unconfiguredOverlay.description', {
                defaultMessage: 'Start exploring your data by adding fields',
              })}
            </p>
            <p>
              <EuiButton fill onClick={onSelectFieldsClicked}>
                {i18n.translate('xpack.graph.unconfiguredOverlay.callToActionLabel', {
                  defaultMessage: 'Select fields',
                })}
              </EuiButton>
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
