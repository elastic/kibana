/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiConfirmModal, EuiSpacer, htmlIdGenerator } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import type { BuildFlavor } from '@kbn/config';
import type { CoreServiceAccountsService } from '@kbn/core-security-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServiceAccountRoleUsage } from '@kbn/security-ui-components';
import {
  hasServiceAccountRoleUsageCallout,
  ServiceAccountRoleUsageCallout,
} from '@kbn/security-ui-components';

interface Props {
  roleName: string;
  canDelete: boolean;
  onDelete: () => void;
  buildFlavor?: BuildFlavor;
  /**
   * The service accounts that hold the role, as the page already looked them up, and where to
   * load their workloads from. The modal warns about them when both are given.
   */
  serviceAccountRoleUsage?: {
    usage: ServiceAccountRoleUsage;
    serviceAccounts: Pick<CoreServiceAccountsService, 'listWorkloads'>;
  };
}

interface State {
  showModal: boolean;
}

export class DeleteRoleButton extends Component<Props, State> {
  public state = {
    showModal: false,
  };

  public render() {
    if (!this.props.canDelete) {
      return null;
    }

    return (
      <Fragment>
        <EuiButtonEmpty color={'danger'} onClick={this.showModal}>
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.deleteRoleButtonLabel"
            defaultMessage="Delete role"
          />
        </EuiButtonEmpty>
        {this.maybeShowModal()}
      </Fragment>
    );
  }

  public maybeShowModal = () => {
    const { buildFlavor, roleName, serviceAccountRoleUsage } = this.props;
    if (!this.state.showModal) {
      return null;
    }
    const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');
    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        titleProps={{ id: confirmModalTitleId }}
        title={
          buildFlavor !== 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deleteRoleTitle"
              defaultMessage="Delete Role"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.editCustomRole.deleteRoleButton.deleteRoleTitle"
              defaultMessage="Delete Role {roleName}?"
              values={{ roleName }}
            />
          )
        }
        onCancel={this.closeModal}
        onConfirm={this.onConfirmDelete}
        cancelButtonText={
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.cancelButtonLabel"
            defaultMessage="No, don't delete"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.confirmButtonLabel"
            defaultMessage="Yes, delete role"
          />
        }
        buttonColor={'danger'}
      >
        <p>
          {buildFlavor !== 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deletingRoleConfirmationText"
              defaultMessage="Are you sure you want to delete this role?"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.roles.confirmDelete.serverless.removingSingleRoleDescription"
              defaultMessage="Users with the {roleName} role assigned may lose access to the project if they are not assigned any other roles."
              values={{ roleName }}
            />
          )}
        </p>
        <p>
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.deletingRoleWarningText"
            defaultMessage="This action cannot be undone!"
          />
        </p>
        {serviceAccountRoleUsage &&
          hasServiceAccountRoleUsageCallout(serviceAccountRoleUsage.usage) && (
            <>
              <EuiSpacer size="m" />
              <ServiceAccountRoleUsageCallout
                usage={serviceAccountRoleUsage.usage}
                serviceAccounts={serviceAccountRoleUsage.serviceAccounts}
                roleCount={1}
                action="delete"
              />
            </>
          )}
      </EuiConfirmModal>
    );
  };

  public closeModal = () => {
    this.setState({
      showModal: false,
    });
  };

  public showModal = () => {
    this.setState({
      showModal: true,
    });
  };

  public onConfirmDelete = () => {
    this.closeModal();
    this.props.onDelete();
  };
}
