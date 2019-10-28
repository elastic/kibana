/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';

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
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.sourceSettingsTitle"
              defaultMessage="Source settings"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        {sourceSettingsEditor}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
