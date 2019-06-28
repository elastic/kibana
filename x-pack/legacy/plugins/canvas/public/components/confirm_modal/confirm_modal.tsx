/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/forbid-elements */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FunctionComponent } from 'react';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelButtonText?: string;
  confirmButtonText?: string;
  className?: string;
}

export const ConfirmModal: FunctionComponent<Props> = props => {
  const {
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmButtonText,
    cancelButtonText,
    className,
    ...rest
  } = props;

  // render nothing if this component isn't open
  if (!isOpen) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        {...rest}
        className={`canvasConfirmModal ${className || ''}`}
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={confirmButtonText}
        cancelButtonText={cancelButtonText}
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        {message}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  cancelButtonText: PropTypes.string,
  confirmButtonText: PropTypes.string,
  className: PropTypes.string,
};

ConfirmModal.defaultProps = {
  title: 'Confirm',
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
};
