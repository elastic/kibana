/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export function SourcelessOverlay() {
  return (
    <div className="gphWorkspaceOverlay">
      <EuiFlexGroup direction="column" className="gphWorkspaceOverlay__content">
        <EuiFlexItem>
          <EuiText>
            <h1>
              {i18n.translate('xpack.graph.sourcelessOverlay.title', {
                defaultMessage: 'No data source configured',
              })}
            </h1>
            <p>
              {i18n.translate('xpack.graph.sourcelessOverlay.description', {
                defaultMessage: 'Choose an index pattern above to get started',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
