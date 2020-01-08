/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { useDeleteTransforms } from '../../../../hooks';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

import { TransformListRow, TRANSFORM_STATE } from '../../../../common';

interface DeleteActionProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}

export const DeleteAction: FC<DeleteActionProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;

  const disabled = items.some((i: TransformListRow) => i.stats.state !== TRANSFORM_STATE.STOPPED);

  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;
  const deleteTransforms = useDeleteTransforms();

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const deleteAndCloseModal = () => {
    setModalVisible(false);
    deleteTransforms(items);
  };
  const openModal = () => setModalVisible(true);

  const buttonDeleteText = i18n.translate('xpack.transform.transformList.deleteActionName', {
    defaultMessage: 'Delete',
  });
  const bulkDeleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteBulkActionDisabledToolTipContent',
    {
      defaultMessage: 'One or more selected transforms must be stopped in order to be deleted.',
    }
  );
  const deleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteActionDisabledToolTipContent',
    {
      defaultMessage: 'Stop the transform in order to delete it.',
    }
  );
  const bulkDeleteModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalTitle',
    {
      defaultMessage: 'Delete {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items.length },
    }
  );
  const deleteModalTitle = i18n.translate('xpack.transform.transformList.deleteModalTitle', {
    defaultMessage: 'Delete {transformId}',
    values: { transformId: items[0] && items[0].config.id },
  });
  const bulkDeleteModalMessage = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalBody',
    {
      defaultMessage:
        "Are you sure you want to delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}? The transform's destination index and optional Kibana index pattern will not be deleted.",
      values: { count: items.length },
    }
  );
  const deleteModalMessage = i18n.translate('xpack.transform.transformList.deleteModalBody', {
    defaultMessage: `Are you sure you want to delete this transform? The transform's destination index and optional Kibana index pattern will not be deleted.`,
  });

  let deleteButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={forceDisable === true || disabled || !canDeleteTransform}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonDeleteText}
    >
      {buttonDeleteText}
    </EuiButtonEmpty>
  );

  if (disabled || !canDeleteTransform) {
    let content;
    if (disabled) {
      content = isBulkAction === true ? bulkDeleteButtonDisabledText : deleteButtonDisabledText;
    } else {
      content = createCapabilityFailureMessage('canDeleteTransform');
    }

    deleteButton = (
      <EuiToolTip position="top" content={content}>
        {deleteButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {deleteButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={isBulkAction === true ? bulkDeleteModalTitle : deleteModalTitle}
            onCancel={closeModal}
            onConfirm={deleteAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.transform.transformList.deleteModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.transform.transformList.deleteModalDeleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            <p>{isBulkAction === true ? bulkDeleteModalMessage : deleteModalMessage}</p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
