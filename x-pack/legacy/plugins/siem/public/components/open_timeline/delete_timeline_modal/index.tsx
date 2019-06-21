/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiModal, EuiToolTip, EuiOverlayMask } from '@elastic/eui';
import * as React from 'react';

import { DeleteTimelines } from '../types';
import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';

import * as i18n from '../translations';

interface Props {
  deleteTimelines?: DeleteTimelines;
  savedObjectId?: string | null;
  title?: string | null;
}

interface State {
  showModal: boolean;
}

/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export class DeleteTimelineModalButton extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showModal: false };
  }

  public render() {
    const { deleteTimelines, savedObjectId, title } = this.props;

    return (
      <>
        <EuiToolTip content={i18n.DELETE}>
          <EuiButtonIcon
            aria-label={i18n.DELETE}
            color="subdued"
            data-test-subj="delete-timeline"
            iconSize="s"
            iconType="trash"
            isDisabled={deleteTimelines == null || savedObjectId == null || savedObjectId === ''}
            onClick={this.toggleShowModal}
            size="s"
          />
        </EuiToolTip>

        {this.state.showModal ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={this.toggleShowModal}>
              <DeleteTimelineModal
                data-test-subj="delete-timeline-modal"
                onDelete={this.onDelete}
                title={title}
                toggleShowModal={this.toggleShowModal}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    );
  }

  private toggleShowModal = () => {
    this.setState(state => ({
      showModal: !state.showModal,
    }));
  };

  private onDelete = () => {
    const { deleteTimelines, savedObjectId } = this.props;

    if (deleteTimelines != null && savedObjectId != null) {
      deleteTimelines([savedObjectId]);
    }

    this.toggleShowModal();
  };
}
