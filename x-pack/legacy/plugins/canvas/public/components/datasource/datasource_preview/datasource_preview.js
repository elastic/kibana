/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { Datatable } from '../../datatable';
import { Error } from '../../error';

export const DatasourcePreview = ({ done, datatable }) => (
  <EuiOverlayMask>
    <EuiModal onClose={done} maxWidth="1000px" className="canvasModal--fixedSize">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Datasource Preview</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="canvasDatasourcePreview">
        <EuiText size="s" color="subdued">
          <p>
            Click <strong>Save</strong> in the sidebar to use this data.
          </p>
        </EuiText>
        {datatable.type === 'error' ? (
          <Error payload={datatable} />
        ) : (
          <EuiPanel className="canvasDatasourcePreview__panel">
            {datatable.rows.length > 0 ? (
              <Datatable datatable={datatable} showHeader paginate />
            ) : (
              <EuiEmptyPrompt
                title={<h2>No documents found</h2>}
                titleSize="s"
                body={
                  <p>
                    We couldn't find any documents matching your search criteria.
                    <br /> Check your datasource settings and try again.
                  </p>
                }
              />
            )}
          </EuiPanel>
        )}
      </EuiModalBody>
    </EuiModal>
  </EuiOverlayMask>
);

DatasourcePreview.propTypes = {
  datatable: PropTypes.object,
  done: PropTypes.func,
};
