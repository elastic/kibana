/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import PropTypes from 'prop-types';
import type { FunctionComponent } from 'react';
import React from 'react';

export interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelButtonText?: string;
  confirmButtonText?: string;
  className?: string;
}

export const ConfirmModal: FunctionComponent<Props> = (props) => {
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

  const modalTitleId = useGeneratedHtmlId();

  // render nothing if this component isn't open
  if (!isOpen) {
    return null;
  }

  return (
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
      data-test-subj="canvasConfirmModal"
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
    >
      {message}
    </EuiConfirmModal>
  );
};

ConfirmModal.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
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
