/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, Fragment, type ReactNode, type SyntheticEvent } from 'react';
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, htmlIdGenerator } from '@elastic/eui';
import type { CcrState } from '../../store/reducers';

import { unfollowLeaderIndex } from '../../store/actions';
import { arrify } from '../../../../common/services/utils';

interface Props {
  unfollowLeaderIndex: (id: string | string[]) => void;
  children: (unfollowLeaderIndex: (id: string | string[]) => void) => ReactNode;
  onConfirm?: () => void;
}

interface State {
  isModalOpen: boolean;
  ids: string[] | null;
}

class FollowerIndexUnfollowProviderUi extends PureComponent<Props, State> {
  state: State = {
    isModalOpen: false,
    ids: null,
  };

  stopModalEventPropagation = (event: SyntheticEvent) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  unfollowLeaderIndex = (id: string | string[]) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    const { ids } = this.state;
    if (!ids) {
      return;
    }
    this.props.unfollowLeaderIndex(ids);
    this.setState({ isModalOpen: false, ids: null });
    this.props.onConfirm?.();
  };

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  renderModal = () => {
    const { ids } = this.state;
    if (!ids) {
      return null;
    }
    const isSingle = ids.length === 1;
    const title = isSingle
      ? i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowSingleTitle',
          {
            defaultMessage: `Unfollow leader index of ''{name}''?`,
            values: { name: ids[0] },
          }
        )
      : i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowMultipleTitle',
          {
            defaultMessage: `Unfollow {count} leader indices?`,
            values: { count: ids.length },
          }
        );
    const modalTitleId = htmlIdGenerator()('confirmModalTitle');

    return (
      <EuiConfirmModal
        aria-labelledby={modalTitleId}
        titleProps={{ id: modalTitleId }}
        title={title}
        onCancel={this.closeConfirmModal}
        onConfirm={this.onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        confirmButtonText={i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Unfollow leader',
          }
        )}
        onMouseOver={this.stopModalEventPropagation}
        onFocus={this.stopModalEventPropagation}
        data-test-subj="unfollowLeaderConfirmation"
      >
        {isSingle ? (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.singleUnfollowDescription"
                defaultMessage="The follower index will be converted to a standard index. It will
                    no longer appear in Cross-Cluster Replication, but you can manage it in Index
                    Management. You can't undo this operation."
              />
            </p>
          </Fragment>
        ) : (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.multipleUnfollowDescription"
                defaultMessage="The follower indices will be converted to standard indices. They
                    will no longer appear in Cross-Cluster Replication, but you can manage them in
                    Index Management. You can't undo this operation."
              />
            </p>
            <ul>
              {ids.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </Fragment>
        )}
      </EuiConfirmModal>
    );
  };

  render() {
    const { children } = this.props;
    const { isModalOpen } = this.state;

    return (
      <Fragment>
        {children(this.unfollowLeaderIndex)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch: ThunkDispatch<CcrState, undefined, AnyAction>) => ({
  unfollowLeaderIndex: (id: string | string[]) => dispatch(unfollowLeaderIndex(id)),
});

export const FollowerIndexUnfollowProvider = connect(
  undefined,
  mapDispatchToProps
)(FollowerIndexUnfollowProviderUi);
