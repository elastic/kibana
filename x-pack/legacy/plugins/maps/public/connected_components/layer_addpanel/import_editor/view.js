/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { GeojsonFileSource } from '../../../layers/sources/client_file_source';
import { EuiSpacer, EuiPanel, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const ImportEditor = ({ clearSource, isIndexingTriggered, ...props }) => {
  const editorProperties = getEditorProperties({ isIndexingTriggered, ...props });
  const editor = GeojsonFileSource.renderEditor(editorProperties);
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
      <EuiPanel style={{ position: 'relative' }}>{editor}</EuiPanel>
    </Fragment>
  );
};

function getEditorProperties({
  inspectorAdapters,
  onRemove,
  viewLayer,
  isIndexingTriggered,
  onIndexReady,
  importSuccessHandler,
  importErrorHandler,
}) {
  return {
    onPreviewSource: viewLayer,
    inspectorAdapters,
    onRemove,
    importSuccessHandler,
    importErrorHandler,
    isIndexingTriggered,
    addAndViewSource: viewLayer,
    onIndexReady,
  };
}
