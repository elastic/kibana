/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiConfirmModal, htmlIdGenerator } from '@elastic/eui';

export interface Props {
  removeClusters: (names: string[]) => void;
  clusterNames: string[];
  children: (showModal: () => void) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
}

export class RemoveClusterButtonProvider extends Component<Props, State> {
  state: State = {
    isModalOpen: false,
  };

  onMouseOverModal = (event: React.MouseEvent) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  showConfirmModal = () => {
    this.setState({
      isModalOpen: true,
    });
  };

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  onConfirm = () => {
    const { removeClusters, clusterNames } = this.props;
    removeClusters(clusterNames);
    this.closeConfirmModal();
  };

  render() {
    const { clusterNames, children } = this.props;
    const { isModalOpen } = this.state;
    const isSingleCluster = clusterNames.length === 1;
    let modal;

    if (isModalOpen) {
      const modalTitleId = htmlIdGenerator()('confirmModalTitle');

      const title = isSingleCluster
        ? i18n.translate(
            'xpack.remoteClusters.removeButton.confirmModal.deleteSingleClusterTitle',
            {
              defaultMessage: "Remove remote cluster ''{name}''?",
              values: { name: clusterNames[0] },
            }
          )
        : i18n.translate('xpack.remoteClusters.removeButton.confirmModal.multipleDeletionTitle', {
            defaultMessage: 'Remove {count} remote clusters?',
            values: { count: clusterNames.length },
          });

      const content = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.removeButton.confirmModal.multipleDeletionDescription"
              defaultMessage="You are about to remove these remote clusters:"
            />
          </p>
          <ul>
            {clusterNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Fragment>
      );

      modal = (
        <>
          <EuiConfirmModal
            data-test-subj="remoteClustersDeleteConfirmModal"
            aria-labelledby={modalTitleId}
            title={title}
            titleProps={{ id: modalTitleId }}
            onCancel={this.closeConfirmModal}
            onConfirm={this.onConfirm}
            cancelButtonText={i18n.translate(
              'xpack.remoteClusters.removeButton.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel',
              }
            )}
            buttonColor="danger"
            confirmButtonText={i18n.translate(
              'xpack.remoteClusters.removeButton.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Remove',
              }
            )}
            onMouseOver={this.onMouseOverModal}
          >
            {!isSingleCluster && content}
          </EuiConfirmModal>
        </>
      );
    }

    return (
      <Fragment>
        {children(this.showConfirmModal)}
        {modal}
      </Fragment>
    );
  }
}
