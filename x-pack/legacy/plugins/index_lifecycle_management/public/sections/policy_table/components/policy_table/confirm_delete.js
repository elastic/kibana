/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { deletePolicy } from '../../../../services/api';
import { showApiError } from '../../../../services/api_errors';

export class ConfirmDelete extends Component {
  deletePolicy = async () => {
    const { policyToDelete, callback } = this.props;
    const policyName = policyToDelete.name;

    try {
      await deletePolicy(policyName);
      const message = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.successMessage', {
        defaultMessage: 'Deleted policy {policyName}',
        values: { policyName }
      });
      toastNotifications.addSuccess(message);
    } catch (e) {
      const title = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.errorMessage', {
        defaultMessage: 'Error deleting policy {policyName}',
        values: { policyName }
      });
      showApiError(e, title);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { policyToDelete, onCancel } = this.props;
    const title = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.title', {
      defaultMessage: 'Delete policy "{name}"',
      values: { name: policyToDelete.name }
    });
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deletePolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.cancelButton"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.deleteButton"
              defaultMessage="Delete"
            />
          }
          buttonColor="danger"
          onClose={onCancel}
        >
          <div>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.undoneWarning"
              defaultMessage="You can't recover a deleted policy."
            />
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
