/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CommonProps,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalProps,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component } from 'react';
import { SpacesManager } from '../../../spaces_manager';
import { Space } from '../../../../../../plugins/spaces/common/model/space';

interface Props {
  space: Space;
  spacesManager: SpacesManager;
  onCancel: () => void;
  onConfirm: () => void;
  intl: InjectedIntl;
}

interface State {
  confirmSpaceName: string;
  error: boolean | null;
  deleteInProgress: boolean;
  isDeletingCurrentSpace: boolean;
}

class ConfirmDeleteModalUI extends Component<Props, State> {
  public state = {
    confirmSpaceName: '',
    error: null,
    deleteInProgress: false,
    isDeletingCurrentSpace: false,
  };

  public componentDidMount() {
    isCurrentSpace(this.props.space, this.props.spacesManager).then(result => {
      this.setState({
        isDeletingCurrentSpace: result,
      });
    });
  }

  public render() {
    const { space, onCancel, intl } = this.props;
    const { isDeletingCurrentSpace } = this.state;

    let warning = null;
    if (isDeletingCurrentSpace) {
      const name = (
        <span>
          (<strong>{space.name}</strong>)
        </span>
      );
      warning = (
        <>
          <EuiSpacer />
          <EuiCallOut color="warning">
            <EuiText>
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.redirectAfterDeletingCurrentSpaceWarningMessage"
                defaultMessage="You are about to delete your current space {name}. You will be redirected to choose a different space if you continue."
                values={{ name }}
              />
            </EuiText>
          </EuiCallOut>
        </>
      );
    }

    // This is largely the same as the built-in EuiConfirmModal component, but we needed the ability
    // to disable the buttons since this could be a long-running operation

    const modalProps: Omit<EuiModalProps, 'children'> & CommonProps = {
      onClose: onCancel,
      className: 'spcConfirmDeleteModal',
      initialFocus: 'input[name="confirmDeleteSpaceInput"]',
    };

    return (
      <EuiOverlayMask>
        <EuiModal {...modalProps}>
          <EuiModalHeader>
            <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.confirmDeleteSpaceButtonLabel"
                defaultMessage="Delete space {spaceName}"
                values={{
                  spaceName: "'" + space.name + "'",
                }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText data-test-subj="confirmModalBodyText">
              <p>
                <FormattedMessage
                  id="xpack.spaces.management.confirmDeleteModal.deletingSpaceWarningMessage"
                  defaultMessage="Deleting a space permanently removes the space and {allContents}. You can't undo this action."
                  values={{
                    allContents: (
                      <strong>
                        <FormattedMessage
                          id="xpack.spaces.management.confirmDeleteModal.allContentsText"
                          defaultMessage="all of its contents"
                        />
                      </strong>
                    ),
                  }}
                />
              </p>

              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.confirmDeleteModal.confirmSpaceNameFormRowLabel',
                  defaultMessage: 'Confirm space name to delete',
                })}
                isInvalid={!!this.state.error}
                error={intl.formatMessage({
                  id: 'xpack.spaces.management.confirmDeleteModal.spaceNamesDoNoMatchErrorMessage',
                  defaultMessage: 'Space names do not match.',
                })}
              >
                <EuiFieldText
                  name="confirmDeleteSpaceInput"
                  value={this.state.confirmSpaceName}
                  onChange={this.onSpaceNameChange}
                  disabled={this.state.deleteInProgress}
                />
              </EuiFormRow>

              {warning}
            </EuiText>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="confirmModalCancelButton"
              onClick={onCancel}
              isDisabled={this.state.deleteInProgress}
            >
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              data-test-subj="confirmModalConfirmButton"
              onClick={this.onConfirm}
              fill
              color={'danger'}
              isLoading={this.state.deleteInProgress}
            >
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.deleteSpaceAndAllContentsButtonLabel"
                defaultMessage=" Delete space and all contents"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  private onSpaceNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof this.state.error === 'boolean') {
      this.setState({
        confirmSpaceName: e.target.value,
        error: e.target.value !== this.props.space.name,
      });
    } else {
      this.setState({
        confirmSpaceName: e.target.value,
      });
    }
  };

  private onConfirm = async () => {
    if (this.state.confirmSpaceName === this.props.space.name) {
      const needsRedirect = this.state.isDeletingCurrentSpace;
      const spacesManager = this.props.spacesManager;

      this.setState({
        deleteInProgress: true,
      });

      await this.props.onConfirm();

      this.setState({
        deleteInProgress: false,
      });

      if (needsRedirect) {
        spacesManager.redirectToSpaceSelector();
      }
    } else {
      this.setState({
        error: true,
      });
    }
  };
}

async function isCurrentSpace(space: Space, spacesManager: SpacesManager) {
  return space.id === (await spacesManager.getActiveSpace()).id;
}

export const ConfirmDeleteModal = injectI18n(ConfirmDeleteModalUI);
