/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ConvertConnectorLogic } from '../../search_index/connector/native_connector_configuration/convert_connector_logic';
import { CANCEL_BUTTON_LABEL } from '../../connectors/translations';

export const ConvertConnectorModal: React.FC = () => {
  const {
    services: { http },
  } = useKibana();
  const { convertConnector, hideModal } = useActions(ConvertConnectorLogic({ http }));
  const { isLoading } = useValues(ConvertConnectorLogic({ http }));

  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      onCancel={() => hideModal()}
      onConfirm={() => convertConnector()}
      title={i18n.translate(
        'xpack.contentConnectors.searchApplications.searchApplication.indices.convertInfexConfirm.title',
        { defaultMessage: 'Sure you want to convert your connector?' }
      )}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.translate(
        'xpack.contentConnectors.searchApplications.searchApplication.indices.convertIndexConfirm.text',
        {
          defaultMessage: 'Yes',
        }
      )}
      isLoading={isLoading}
      defaultFocusedButton="confirm"
      maxWidth
    >
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.contentConnectors.searchApplications.searchApplication.indices.convertIndexConfirm.description',
            {
              defaultMessage:
                "Converting an Elastic managed connector to a self-managed connector can't be undone.",
            }
          )}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
