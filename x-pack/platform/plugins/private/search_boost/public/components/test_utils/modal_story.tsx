/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { EuiButton } from '@elastic/eui';

interface ModalStoryProps {
  buttonLabel: string;
  renderModal: (close: () => void) => ReactNode;
}

export const ModalStory = ({ buttonLabel, renderModal }: ModalStoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <EuiButton onClick={() => setIsOpen(true)} data-test-subj="searchBoostOpenModalStory">
        {buttonLabel}
      </EuiButton>
      {isOpen && renderModal(close)}
    </>
  );
};
