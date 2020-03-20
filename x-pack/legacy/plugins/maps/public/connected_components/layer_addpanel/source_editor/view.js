/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { getSourceById } from '../../../layers/sources/source_registry';
import { EuiSpacer, EuiPanel, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SourceEditor = ({
  clearSource,
  sourceId,
  isIndexingTriggered,
  inspectorAdapters,
  previewLayer,
}) => {
  const source = getSourceById(sourceId);
  if (!source) {
    return null;
  }

  return (
    <Fragment>
      {isIndexingTriggered ? null : (
        <Fragment>
          <EuiButtonEmpty size="xs" flush="left" onClick={clearSource} iconType="arrowLeft">
            <FormattedMessage
              id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
              defaultMessage="Change data source"
            />
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
        </Fragment>
      )}
      <EuiPanel>
        {source.renderCreateEditor({ onPreviewSource: previewLayer, inspectorAdapters })}
      </EuiPanel>
    </Fragment>
  );
};
