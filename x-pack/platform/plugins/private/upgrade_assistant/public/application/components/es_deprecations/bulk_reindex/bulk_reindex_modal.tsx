/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FunctionComponent } from 'react';

import {
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiCodeBlock,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface Props {
  indices: Set<string>;
}

const getBulkReindexConsoleCommand = (indices: Set<string>) => {
  const sourceIndices = Array.from(indices)
    .map((index) => `"${index}"`)
    .join(',\n    ');

  return `POST kbn:api/upgrade_assistant/reindex/batch
{
  "indexNames": [
    ${sourceIndices}
  ]
}
  `;
}

export const BulkReindexModal: FunctionComponent<Props> = ({
  indices,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const modalTitleId = useGeneratedHtmlId();

  return (
    <>
      <EuiButton onClick={showModal}>Bulk reindex</EuiButton>
      {isModalVisible && (
        <EuiModal aria-labelledby={modalTitleId} onClose={closeModal} style={{ width: 800 }}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              Bulk reindexing
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            This command will make use of the batch reindexing API to reindex the following indices:
            <EuiSpacer />
            <EuiCodeBlock language="json" isCopyable overflowHeight={250}>
              {getBulkReindexConsoleCommand(indices)}
            </EuiCodeBlock>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>Close</EuiButtonEmpty>
            <EuiButton onClick={closeModal} fill>
              Open in Console
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
