/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { LazyErrorComponent } from '@kbn/expression-error-plugin/public';
import { Datatable } from '../../datatable';

const Error = withSuspense(LazyErrorComponent);

const strings = {
  getEmptyFirstLineDescription: () =>
    i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptyFirstLineDescription', {
      defaultMessage: "We couldn't find any documents matching your search criteria.",
    }),
  getEmptySecondLineDescription: () =>
    i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptySecondLineDescription', {
      defaultMessage: 'Check your datasource settings and try again.',
    }),
  getEmptyTitle: () =>
    i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptyTitle', {
      defaultMessage: 'No documents found',
    }),
  getModalTitle: () =>
    i18n.translate('xpack.canvas.datasourceDatasourcePreview.modalTitle', {
      defaultMessage: 'Datasource preview',
    }),
  getSaveButtonLabel: () =>
    i18n.translate('xpack.canvas.datasourceDatasourcePreview.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
};

export const DatasourcePreview = ({ done, datatable }) => (
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
              saveLabel: <strong>{strings.getSaveButtonLabel()}</strong>,
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
);

DatasourcePreview.propTypes = {
  datatable: PropTypes.object,
  done: PropTypes.func,
};
