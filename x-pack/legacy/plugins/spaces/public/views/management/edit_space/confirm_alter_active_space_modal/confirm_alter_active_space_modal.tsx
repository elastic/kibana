/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  intl: InjectedIntl;
}

class ConfirmAlterActiveSpaceModalUI extends Component<Props, {}> {
  public render() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          onConfirm={this.props.onConfirm}
          onCancel={this.props.onCancel}
          title={
            <FormattedMessage
              id="xpack.spaces.management.confirmAlterActiveSpaceModal.title"
              defaultMessage="Confirm update space"
            />
          }
          defaultFocusedButton={'confirm'}
          cancelButtonText={this.props.intl.formatMessage({
            id: 'xpack.spaces.management.confirmAlterActiveSpaceModal.cancelButton',
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={this.props.intl.formatMessage({
            id: 'xpack.spaces.management.confirmAlterActiveSpaceModal.updateSpaceButton',
            defaultMessage: 'Update space',
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.spaces.management.confirmAlterActiveSpaceModal.reloadWarningMessage"
              defaultMessage="You have updated the visible features in this space. Your page will reload after saving."
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}

export const ConfirmAlterActiveSpaceModal = injectI18n(ConfirmAlterActiveSpaceModalUI);
