/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
  EuiSpacer,
} from '@elastic/eui';
import { Datatable } from '../../datatable';
import { Error } from '../../error';
import { ComponentStrings } from '../../../../i18n';

const { DatasourceDatasourcePreview: strings } = ComponentStrings;
const { DatasourceDatasourceComponent: datasourceStrings } = ComponentStrings;

export const DatasourcePreview = ({ done, datatable }) => (
  <EuiOverlayMask>
    <EuiModal onClose={done} maxWidth="1000px" className="canvasModal--fixedSize">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{strings.getModalTitle()}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="canvasDatasourcePreview">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.canvas.datasourceDatasourcePreview.modalDescription"
              defaultMessage="The following data will be available to the selected element upon clicking {saveLabel} in the sidebar."
              values={{
                saveLabel: <strong>{datasourceStrings.getSaveButtonLabel()}</strong>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {datatable.type === 'error' ? (
          <Error payload={datatable} />
        ) : (
          <EuiPanel className="canvasDatasourcePreview__panel" paddingSize="none">
            {datatable.rows.length > 0 ? (
              <Datatable datatable={datatable} showHeader paginate />
            ) : (
              <EuiEmptyPrompt
                title={<h2>{strings.getEmptyTitle()}</h2>}
                titleSize="s"
                body={
                  <p>
                    {strings.getEmptyFirstLineDescription()}
                    <br />
                    {strings.getEmptySecondLineDescription()}
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
