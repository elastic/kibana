/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';

import { useActions, useValues } from 'kea';

import { omit } from 'lodash';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiCheckbox,
  EuiConfirmModal,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ConnectorsLogic } from './connectors_logic';

export interface DeleteConnectorModalProps {
  isCrawler: boolean;
}
export const DeleteConnectorModal: React.FC<DeleteConnectorModalProps> = ({ isCrawler }) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const [connectorUiOptions, setConnectorUiOptions] = useLocalStorage<
    Record<string, { deploymentMethod: 'docker' | 'source' | null }>
  >('search:connector-ui-options', {});
  const {
    services: { http },
  } = useKibana();
  const { closeDeleteModal, deleteConnector } = useActions(ConnectorsLogic({ http }));

  const {
    deleteModalConnectorId: connectorId,
    deleteModalConnectorName,
    deleteModalIndexName,
    isDeleteLoading,
    isDeleteModalVisible,
  } = useValues(ConnectorsLogic({ http }));

  const connectorName = (isCrawler ? deleteModalIndexName : deleteModalConnectorName) || '';

  const [inputConnectorName, setInputConnectorName] = useState('');
  const [shouldDeleteIndex, setShouldDeleteIndex] = useState(false);

  useEffect(() => {
    setShouldDeleteIndex(false);
    setInputConnectorName('');
  }, [isDeleteModalVisible, isCrawler]);

  return isDeleteModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      titleProps={{ id: confirmModalTitleId }}
      title={
        !isCrawler
          ? i18n.translate('xpack.contentConnectors.content.connectors.deleteModal.title', {
              defaultMessage: 'Delete {connectorCount} connector?',
              values: { connectorCount: 1 },
            })
          : i18n.translate('xpack.contentConnectors.content.crawlers.deleteModal.title', {
              defaultMessage: 'Delete {connectorCount} crawler?',
              values: { connectorCount: 1 },
            })
      }
      onCancel={() => {
        closeDeleteModal();
      }}
      onConfirm={() => {
        deleteConnector({
          connectorId,
          connectorName,
          shouldDeleteIndex,
          http,
        });
        setConnectorUiOptions(omit(connectorUiOptions, connectorId));
      }}
      cancelButtonText={
        isDeleteLoading
          ? i18n.translate(
              'xpack.contentConnectors.content.connectors.deleteModal.closeButton.title',
              {
                defaultMessage: 'Close',
              }
            )
          : i18n.translate(
              'xpack.contentConnectors.content.connectors.deleteModal.cancelButton.title',
              {
                defaultMessage: 'Cancel',
              }
            )
      }
      confirmButtonText={i18n.translate(
        'xpack.contentConnectors.content.connectors.deleteModal.confirmButton.title',
        {
          defaultMessage: 'Delete',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
      confirmButtonDisabled={inputConnectorName.trim() !== connectorName}
      isLoading={isDeleteLoading}
    >
      <p>
        {!isCrawler
          ? i18n.translate(
              'xpack.contentConnectors.content.connectors.deleteModal.delete.connector.description',
              {
                defaultMessage: 'You are about to delete this connector:',
              }
            )
          : i18n.translate(
              'xpack.contentConnectors.content.connectors.deleteModal.delete.crawler.description',
              {
                defaultMessage: 'You are about to delete this crawler:',
              }
            )}
      </p>
      <p>
        <ul>
          <li>
            <FormattedMessage
              id="xpack.contentConnectors.deleteConnectorModal.li.myconnectornameRelatedIndexLabel"
              defaultMessage="{connectorName} (Related index: {deleteModalIndexName} )"
              values={{
                connectorName,
                deleteModalIndexName: deleteModalIndexName || '-',
              }}
            />
          </li>
        </ul>
      </p>
      <p>
        {isCrawler && (
          <EuiText>
            <FormattedMessage
              id="xpack.contentConnectors.deleteConnectorModal.crawler.warning"
              defaultMessage="Deleting this crawler will also delete its related index with all of its data and its Crawler configuration. Any associated search applications will no longer be able to access any data stored in this index. This action cannot be undone. Please type {connectorName} to confirm."
              values={{
                connectorName: (
                  <strong>
                    <EuiTextColor color="danger">{connectorName}</EuiTextColor>
                  </strong>
                ),
              }}
            />
          </EuiText>
        )}
        {!isCrawler && (
          <EuiText>
            <FormattedMessage
              id="xpack.contentConnectors.content.connectors.deleteModal.syncsWarning.indexNameDescription"
              defaultMessage="This action cannot be undone. Please type {connectorName} to confirm."
              values={{
                connectorName: (
                  <strong>
                    <EuiTextColor color="danger">{connectorName}</EuiTextColor>
                  </strong>
                ),
              }}
            />
          </EuiText>
        )}
      </p>
      {deleteModalIndexName && !isCrawler && (
        <>
          <EuiCheckbox
            id="delete-related-index"
            label={i18n.translate(
              'xpack.contentConnectorsdeleteConnectorModal.euiCheckbox.deleteAlsoRelatedIndexLabel',
              { defaultMessage: 'Also delete related index' }
            )}
            checked={shouldDeleteIndex}
            onChange={() => setShouldDeleteIndex(!shouldDeleteIndex)}
          />
          <EuiSpacer />
        </>
      )}
      <EuiForm>
        <EuiFormRow
          label={
            !isCrawler
              ? i18n.translate(
                  'xpack.contentConnectors.content.connectors.deleteModal.connector.indexNameInput.label',
                  {
                    defaultMessage: 'Connector name',
                  }
                )
              : i18n.translate(
                  'xpack.contentConnectors.content.connectors.deleteModal.crawler.indexNameInput.label',
                  {
                    defaultMessage: 'Crawler name',
                  }
                )
          }
        >
          <EuiFieldText
            data-test-subj="entSearchContent-connectors-deleteModal-input"
            data-telemetry-id="entSearchContent-connectors-deleteModal-input"
            onChange={(e) => setInputConnectorName(e.target.value)}
            value={inputConnectorName}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiConfirmModal>
  ) : null;
};