/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';

import { removeLifecycleForIndex } from '../../application/services/api';
import { showApiError } from '../../application/services/api_errors';
import { toasts } from '../../application/services/notification';

interface Props {
  indexNames: string[];
  closeModal: () => void;
  reloadIndices: () => void;
}

export class RemoveLifecyclePolicyConfirmModal extends Component<Props> {
  removePolicy = async () => {
    const { indexNames, closeModal, reloadIndices } = this.props;

    try {
      await removeLifecycleForIndex(indexNames);
      closeModal();
      toasts.addSuccess(
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicySuccess',
          {
            defaultMessage:
              'Removed lifecycle policy from {count, plural, one {index} other {indices}}',
            values: {
              count: indexNames.length,
            },
          }
        )
      );
      reloadIndices();
    } catch (err) {
      showApiError(
        err,
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicyToIndexError',
          {
            defaultMessage: 'Error removing policy',
          }
        )
      );
    }
  };

  render() {
    const { closeModal, indexNames } = this.props;

    return (
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.modalTitle"
            defaultMessage="Remove lifecycle policy from {count, plural, one {index} other {indices}}"
            values={{
              count: indexNames.length,
            }}
          />
        }
        onCancel={closeModal}
        onConfirm={this.removePolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.cancelButtonText"
            defaultMessage="Cancel"
          />
        }
        buttonColor="danger"
        confirmButtonText={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicyButtonText"
            defaultMessage="Remove policy"
          />
        }
      >
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removeMessage"
              defaultMessage="You are about to remove the index lifecycle policy from
                  {count, plural, one {this index} other {these indices}}.
                  This operation cannot be undone."
              values={{
                count: indexNames.length,
              }}
            />
          </p>

          <ul>
            {indexNames.map((indexName) => (
              <li key={indexName}>{indexName}</li>
            ))}
          </ul>
        </Fragment>
      </EuiConfirmModal>
    );
  }
}
