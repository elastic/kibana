/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from './translations';

/** Shell for the placeholder dialogs: a title and a Close button. */
export const PlaceholderModal: React.FC<{
  title: string;
  onClose: () => void;
  testSubj: string;
}> = ({ title, onClose, testSubj }) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj={testSubj}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{i18n.COMING}</EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          {i18n.CLOSE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
PlaceholderModal.displayName = 'PlaceholderModal';
