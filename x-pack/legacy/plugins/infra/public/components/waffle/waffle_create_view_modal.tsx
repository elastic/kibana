/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiFieldText,
} from '@elastic/eui';

interface Props {
  close(): void;
  save(view: { [p: string]: string }): void;
}

export const WaffleCreateViewModal = ({ close, save }: Props) => {
  const [viewName, setViewName] = useState('');
  const textChange = useCallback(e => {
    setViewName(e.target.value);
  }, []);

  const saveView = useCallback(() => {
    save({ name: viewName });
  }, []);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={close}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Save View</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFieldText
            placeholder="View name"
            value={viewName}
            onChange={textChange}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={close}>Cancel</EuiButtonEmpty>
          <EuiButton color="primary" onClick={saveView}>
            Save
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
