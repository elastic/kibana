/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiBasicTable, EuiButtonEmpty, EuiSpacer, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useEnrollmentApiKeys, useEnrollmentApiKey } from './hooks';
import { EnrollmentApiKey } from '../../../../../common/types/domain_data';
import { useLibs, usePagination } from '../../../../hooks';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import { CreateApiKeyForm } from './create_api_key_form';

export { useEnrollmentApiKeys, useEnrollmentApiKey } from './hooks';

export const EnrollmentApiKeysTable: React.FC = () => {
  const { enrollmentApiKeys } = useLibs();
  const [confirmDeleteApiKeyId, setConfirmDeleteApiKeyId] = useState<string | null>(null);
  const { pagination } = usePagination();
  const { data, isLoading, refresh } = useEnrollmentApiKeys(pagination);

  const columns: any[] = [
    {
      field: 'name',
      name: i18n.translate('xpack.fleet.apiKeysList.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      width: '300px',
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Policy',
      }),
      width: '100px',
    },
    {
      field: null,
      name: i18n.translate('xpack.fleet.agentList.apiKeyColumnTitle', {
        defaultMessage: 'API Key',
      }),
      render: (key: EnrollmentApiKey) => <ApiKeyField apiKeyId={key.id} />,
    },
    {
      field: null,
      width: '50px',
      render: (key: EnrollmentApiKey) => {
        return (
          <EuiButtonEmpty onClick={() => setConfirmDeleteApiKeyId(key.id)} iconType={'trash'} />
        );
      },
    },
  ];

  return (
    <>
      {confirmDeleteApiKeyId && (
        <ConfirmDeleteModal
          apiKeyId={confirmDeleteApiKeyId}
          onCancel={() => setConfirmDeleteApiKeyId(null)}
          onConfirm={async () => {
            await enrollmentApiKeys.delete(confirmDeleteApiKeyId);
            setConfirmDeleteApiKeyId(null);
            refresh();
          }}
        />
      )}
      <EuiBasicTable
        compressed={true}
        loading={isLoading}
        noItemsMessage={
          <FormattedMessage
            id="xpack.fleet.agentList.emptyEnrollmentKeysMessage"
            defaultMessage="No api keys"
          />
        }
        items={data ? data.list : []}
        itemId="id"
        columns={columns}
      />
      <EuiSpacer size={'s'} />
      <CreateApiKeyButton onChange={() => refresh()} />
    </>
  );
};

const CreateApiKeyButton: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiButtonEmpty
          onClick={() => setIsOpen(true)}
          color="text"
          iconType={'plusInCircle'}
          size="xs"
        >
          <FormattedMessage
            id="xpack.fleet.enrollmentApiKeyList.createNewButton"
            defaultMessage="Create a new key"
          />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <CreateApiKeyForm
        onChange={() => {
          setIsOpen(false);
          onChange();
        }}
      />
    </EuiPopover>
  );
  return <></>;
};

const ApiKeyField: React.FC<{ apiKeyId: string }> = ({ apiKeyId }) => {
  const [visible, setVisible] = useState(false);
  const { data } = useEnrollmentApiKey(apiKeyId);

  return (
    <>
      {visible && data ? data.item.api_key : '••••••••••••••••••••••••••••'}
      <EuiButtonEmpty size="xs" color={'text'} onClick={() => setVisible(!visible)}>
        {visible ? (
          <FormattedMessage
            id="xpack.fleet.enrollmentApiKeyList.hideTableButton"
            defaultMessage="Hide"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.enrollmentApiKeyList.viewTableButton"
            defaultMessage="View"
          />
        )}
      </EuiButtonEmpty>{' '}
    </>
  );
};
