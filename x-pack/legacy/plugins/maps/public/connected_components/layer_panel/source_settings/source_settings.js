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

export function SourceSettings({ layer, updateSourceProp }) {

  const onSourceChange = ({ propName, value }) => {
    updateSourceProp(layer.getId(), propName, value);
  };

  const sourceSettingsEditor = layer.renderSourceSettingsEditor({ onChange: onSourceChange });

  if (!sourceSettingsEditor) {
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
                  id="xpack.maps.layerPanel.sourceSettingsTitle"
                  defaultMessage="Source Settings"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m"/>

        {sourceSettingsEditor}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
