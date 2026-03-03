/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { useState } from 'react';

const ConfirmModal = ({
  onClose,
  title,
  children,
  confirmButtonText,
  setElement,
}: {
  onClose: (confirmed: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmButtonText: React.ReactNode;
  setElement: (element: React.ReactNode | undefined) => void;
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={title}
      titleProps={{ id: modalTitleId }}
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
      maxWidth
    >
      <EuiText>{children}</EuiText>
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
  confirm: () => Promise<boolean>;
} {
  const [element, setElement] = useState<React.ReactNode | undefined>(undefined);

  const confirm = () => {
    return new Promise<boolean>((resolve) => {
      setElement(() => {
        return (
          <ConfirmModal
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
