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
import type { CcrState } from '../store/reducers';

import { deleteAutoFollowPattern } from '../store/actions';
import { arrify } from '../../../common/services/utils';

interface Props {
  /** Thunk is typed as `string` but the API accepts single or multiple ids. */
  deleteAutoFollowPattern: (id: string | string[]) => void;
  children: (deleteAutoFollowPattern: (id: string | string[]) => void) => ReactNode;
}

interface State {
  isModalOpen: boolean;
  ids: string[] | null;
}

class AutoFollowPatternDeleteProviderUi extends PureComponent<Props, State> {
  state: State = {
    isModalOpen: false,
    ids: null,
  };

  stopModalEventPropagation = (event: SyntheticEvent) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  deleteAutoFollowPattern = (id: string | string[]) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    const { ids } = this.state;
    if (!ids) {
      return;
    }
    this.props.deleteAutoFollowPattern(ids);
    this.setState({ isModalOpen: false, ids: null });
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
          'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteSingleTitle',
          {
            defaultMessage: `Remove auto-follow pattern ''{name}''?`,
            values: { name: ids[0] },
          }
        )
      : i18n.translate(
          'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteMultipleTitle',
          {
            defaultMessage: `Remove {count} auto-follow patterns?`,
            values: { count: ids.length },
          }
        );

    const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');

    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={title}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={this.closeConfirmModal}
        onConfirm={this.onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        confirmButtonText={i18n.translate(
          'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Remove',
          }
        )}
        onMouseOver={this.stopModalEventPropagation}
        onFocus={this.stopModalEventPropagation}
        data-test-subj="deleteAutoFollowPatternConfirmation"
      >
        {!isSingle && (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.multipleDeletionDescription"
                defaultMessage="You are about to remove these auto-follow patterns:"
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
        {children(this.deleteAutoFollowPattern)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch: ThunkDispatch<CcrState, undefined, AnyAction>) => ({
  deleteAutoFollowPattern: (id: string | string[]) => dispatch(deleteAutoFollowPattern(id)),
});

export const AutoFollowPatternDeleteProvider = connect(
  undefined,
  mapDispatchToProps
)(AutoFollowPatternDeleteProviderUi);
