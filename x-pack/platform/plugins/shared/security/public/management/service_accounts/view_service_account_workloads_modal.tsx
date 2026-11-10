/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';

import type { ServiceAccountBoundWorkload } from '@kbn/core-security-common';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { BoundWorkloadsTable } from './bound_workloads_table';
import type {
  ServiceAccountDirectoryEntry,
  ServiceAccountsAPIClient,
} from '../../service_accounts';

export interface ServiceAccountWorkloadsModalProps {
  serviceAccount: Pick<ServiceAccountDirectoryEntry, 'id' | 'name'>;
  serviceAccountsAPIClient: Pick<PublicMethodsOf<ServiceAccountsAPIClient>, 'listWorkloads'>;
  onClose: () => void;
  onError: (error: Error, title: string) => void;
}

/** Lists the workloads bound to one service account. */
export const ServiceAccountWorkloadsModal = ({
  serviceAccount: { id, name },
  serviceAccountsAPIClient,
  onClose,
  onError,
}: ServiceAccountWorkloadsModalProps) => {
  const [workloads, setWorkloads] = useState<ServiceAccountBoundWorkload[]>();
  const callbacks = useLatest({ onClose, onError });
  const titleId = useGeneratedHtmlId({ prefix: 'serviceAccountWorkloadsModalTitle' });

  useEffect(() => {
    let isCurrent = true;
    serviceAccountsAPIClient.listWorkloads(id).then(
      (response) => {
        if (isCurrent) setWorkloads(response.workloads);
      },
      (error) => {
        if (isCurrent) {
          callbacks.current.onError(
            error,
            i18n.translate('xpack.security.management.serviceAccounts.workloadsModal.loadError', {
              defaultMessage: 'Unable to load the workloads of "{name}"',
              values: { name },
            })
          );
          callbacks.current.onClose();
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [id, name, serviceAccountsAPIClient, callbacks]);

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onClose}
      initialFocus="[data-test-subj=serviceAccountWorkloadsModalClose]"
      data-test-subj="serviceAccountWorkloadsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.security.management.serviceAccounts.workloadsModal.title', {
            defaultMessage: 'Workloads bound to "{name}"',
            values: { name },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {workloads ? (
          <BoundWorkloadsTable workloads={workloads} />
        ) : (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="l"
                aria-label={i18n.translate(
                  'xpack.security.management.serviceAccounts.workloadsModal.loading',
                  { defaultMessage: 'Loading bound workloads' }
                )}
                data-test-subj="serviceAccountWorkloadsLoading"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="serviceAccountWorkloadsModalClose">
          {i18n.translate('xpack.security.management.serviceAccounts.workloadsModal.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
