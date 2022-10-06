/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiModal, EuiModalHeader, EuiModalBody, EuiText } from '@elastic/eui';
import { exampleFileKind, MyImageMetadata } from '../../common';
import { FilesClient, UploadFile } from '../imports';

interface Props {
  client: FilesClient<MyImageMetadata>;
  onDismiss: () => void;
  onUploaded: () => void;
}

export const Modal: FunctionComponent<Props> = ({ onDismiss, onUploaded, client }) => {
  return (
    <EuiModal onClose={onDismiss}>
      <EuiModalHeader>
        <EuiText>
          <h2>Upload image</h2>
        </EuiText>
      </EuiModalHeader>
      <EuiModalBody>
        <UploadFile
          kind={exampleFileKind.id}
          client={client}
          onDone={onUploaded}
          meta={{ custom: 'meta' }}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
