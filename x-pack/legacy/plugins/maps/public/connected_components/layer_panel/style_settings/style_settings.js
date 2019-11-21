/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export function StyleSettings({ layer, updateStyleDescriptor }) {

  const settingsEditor = layer.renderStyleEditor({ onStyleDescriptorChange: updateStyleDescriptor });

  if (!settingsEditor) {
    return null;
  }

  return (
    <Fragment>
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.maps.layerPanel.styleSettingsTitle"
                  defaultMessage="Layer Style"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m"/>

        {settingsEditor}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
