/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiConfirmModal, EuiText } from '@elastic/eui';
import { useState } from 'react';
import { css } from '@emotion/css';

const ConfirmModal = ({
  checkboxLabel,
  onClose,
  title,
  children,
  confirmButtonText,
  setElement,
}: {
  checkboxLabel: string;
  onClose: (confirmed: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmButtonText: React.ReactNode;
  setElement: (element: React.ReactNode | undefined) => void;
}) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <EuiConfirmModal
      title={title}
      onConfirm={() => {
        onClose(true);
        setElement(undefined);
      }}
      onCancel={() => {
        onClose(false);
        setElement(undefined);
      }}
      confirmButtonText={confirmButtonText}
      cancelButtonText="Cancel"
      buttonColor="danger"
      confirmButtonDisabled={!isChecked}
      maxWidth
    >
      <EuiText>{children}</EuiText>
      <EuiCheckbox
        id="deleteConfirmationCheckbox"
        label={checkboxLabel}
        checked={isChecked}
        onChange={(e) => setIsChecked(e.target.checked)}
        className={css`
          margin-top: 15px;
        `}
      />
    </EuiConfirmModal>
  );
};

export function useConfirmModal({
  title,
  children,
  confirmButtonText,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  confirmButtonText: React.ReactNode;
}): {
  element: React.ReactNode | undefined;
  confirm: (checkBoxLabel: string) => Promise<boolean>;
} {
  const [element, setElement] = useState<React.ReactNode | undefined>(undefined);

  const confirm = (checkboxLabel: string) => {
    return new Promise<boolean>((resolve) => {
      setElement(() => {
        return (
          <ConfirmModal
            checkboxLabel={checkboxLabel}
            onClose={resolve}
            title={title}
            children={children}
            confirmButtonText={confirmButtonText}
            setElement={setElement}
          />
        );
      });
    });
  };

  return {
    element,
    confirm,
  };
}
