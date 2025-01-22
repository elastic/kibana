/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiComboBox,
  EuiFlexItem,
  EuiButton,
  EuiConfirmModal,
} from '@elastic/eui';
import { useMutation, useQuery } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  sendDeletePackagePolicy,
  sendGetOrphanedIntegrationPolicies,
  useStartServices,
} from '../../../hooks';
import { queryClient } from '..';

import { CodeBlock } from './code_block';

const fetchOrphanedPolicies = async () => {
  const response = await sendGetOrphanedIntegrationPolicies();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.items ?? [];
};

export const OrphanedIntegrationPolicyDebugger: React.FunctionComponent = () => {
  const { notifications } = useStartServices();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleteAllModalVisible, setIsDeleteAllModalVisible] = useState(false);

  const { data: orphanedPolicies } = useQuery(['debug-orphaned-policies'], fetchOrphanedPolicies);

  const comboBoxOptions =
    orphanedPolicies?.map((policy: { id: string; name: string }) => ({
      label: policy.name,
      value: policy.id,
    })) ?? [];

  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find(({ value }: { value: string }) => value === selectedPolicyId)!]
    : [];

  const selectedPolicy = orphanedPolicies?.find(
    (policy: { id: string }) => policy.id === selectedPolicyId
  );

  const deleteOnePolicyMutation = useMutation(async (policyId: string) => {
    const response = await sendDeletePackagePolicy({
      packagePolicyIds: [policyId],
      force: true,
    });

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: i18n.translate('xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteError', {
          defaultMessage: 'Error deleting policy',
        }),
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess(
      i18n.translate('xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteSuccess', {
        defaultMessage: 'Successfully deleted orphaned policy',
      })
    );
    queryClient.invalidateQueries(['debug-orphaned-policies']);
    setSelectedPolicyId(undefined);
    setIsDeleteModalVisible(false);

    return response.data;
  });

  const deleteAllPoliciesMutation = useMutation(async () => {
    const response = await sendDeletePackagePolicy({
      packagePolicyIds: orphanedPolicies?.map((policy: { id: string }) => policy.id),
      force: true,
    });

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: i18n.translate(
          'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteAllError',
          { defaultMessage: 'Error deleting orphaned policies' }
        ),
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess(
      i18n.translate('xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteAllSuccess', {
        defaultMessage: 'Successfully deleted all orphaned policies',
      })
    );
    queryClient.invalidateQueries(['debug-orphaned-policies']);
    setSelectedPolicyId(undefined);
    setIsDeleteAllModalVisible(false);

    return response.data;
  });

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.description"
            defaultMessage='This tool can be used to delete "orphaned" integration policies that have been unlinked from their parent agent policy objects'
          />
        </p>

        <p>
          <FormattedMessage
            id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteOptions"
            defaultMessage='You may delete a single orphaned integration policy or use the "Delete all" button to delete all orphaned integration policies at once.'
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 400px;
          `}
        >
          <EuiComboBox
            aria-label={i18n.translate(
              'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.selectLabel',
              { defaultMessage: 'Select an orphaned integration policy' }
            )}
            placeholder={i18n.translate(
              'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.selectLabel',
              { defaultMessage: 'Select an orphaned integration policy' }
            )}
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            onChange={(newSelectedOptions: any[]) => {
              if (!newSelectedOptions.length) {
                setSelectedPolicyId(undefined);
              } else {
                setSelectedPolicyId(newSelectedOptions[0].value);
              }
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="warning"
              isDisabled={!selectedPolicyId}
              onClick={() => setIsDeleteModalVisible(true)}
            >
              <FormattedMessage
                id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteButton"
                defaultMessage="Delete"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="danger"
              isDisabled={!orphanedPolicies?.length}
              onClick={() => setIsDeleteAllModalVisible(true)}
            >
              <FormattedMessage
                id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteAllButton"
                defaultMessage="Delete all"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDeleteModalVisible && selectedPolicy && selectedPolicyId && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteModalTitle',
            { defaultMessage: 'Delete {policyName}', values: { policyName: selectedPolicy.name } }
          )}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={() => deleteOnePolicyMutation.mutate(selectedPolicyId)}
          isLoading={deleteOnePolicyMutation.isLoading}
          cancelButtonText={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.cancelDelete',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.confirmDelete',
            { defaultMessage: 'Delete' }
          )}
        >
          <FormattedMessage
            id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteModalBody"
            defaultMessage="Are you sure you want to delete {policyName}?"
            values={{ policyName: selectedPolicy.name }}
          />
        </EuiConfirmModal>
      )}

      {isDeleteAllModalVisible && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteAllModalTitle',
            { defaultMessage: 'Delete all orphaned integration policies' }
          )}
          onCancel={() => setIsDeleteAllModalVisible(false)}
          onConfirm={() => deleteAllPoliciesMutation.mutate()}
          isLoading={deleteAllPoliciesMutation.isLoading}
          cancelButtonText={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.cancelDeleteAll',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.fleet.debug.orphanedIntegrationPolicyDebugger.confirmDeleteAll',
            { defaultMessage: 'Delete all' }
          )}
        >
          <FormattedMessage
            id="xpack.fleet.debug.orphanedIntegrationPolicyDebugger.deleteAllModalBody"
            defaultMessage="Are you sure you want to delete all orphaned integration policies?"
          />
        </EuiConfirmModal>
      )}

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(selectedPolicy, null, 2)} />
        </>
      )}
    </>
  );
};
