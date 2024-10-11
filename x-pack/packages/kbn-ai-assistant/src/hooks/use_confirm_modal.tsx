/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { useState } from 'react';

export function useConfirmModal({
  title,
  children,
  confirmButtonText,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  confirmButtonText: React.ReactNode;
}) {
  const [element, setElement] = useState<React.ReactNode | undefined>(undefined);

  const confirm = () => {
    return new Promise<boolean>((resolve) => {
      setElement(
        <EuiConfirmModal
          title={title}
          onConfirm={() => {
            resolve(true);
            setElement(undefined);
          }}
          onCancel={() => {
            resolve(false);
            setElement(undefined);
          }}
          confirmButtonText={confirmButtonText}
        >
          {children}
        </EuiConfirmModal>
      );
    });
  };

  return {
    element,
    confirm,
  };
}
