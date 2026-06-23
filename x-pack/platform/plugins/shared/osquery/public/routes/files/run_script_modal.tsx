/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiCode,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface RunScriptModalProps {
  path: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RunScriptModal: React.FC<RunScriptModalProps> = ({ path, onConfirm, onCancel }) => {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <EuiModal onClose={onCancel} data-test-subj="runScriptModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.osquery.fileSystem.runScript.modalTitle"
            defaultMessage="Run script on endpoint"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={
            <FormattedMessage
              id="xpack.osquery.fileSystem.runScript.warningTitle"
              defaultMessage="This will execute a file on the remote endpoint"
            />
          }
        />
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.osquery.fileSystem.runScript.confirmBody"
            defaultMessage="The Endpoint agent will execute the following path as a script on the host. Confirm only if you intended to run this file."
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCode data-test-subj="runScriptPath">{path}</EuiCode>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="runScriptCancel">
          <FormattedMessage
            id="xpack.osquery.fileSystem.runScript.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton fill color="danger" onClick={handleConfirm} data-test-subj="runScriptConfirm">
          <FormattedMessage
            id="xpack.osquery.fileSystem.runScript.confirm"
            defaultMessage="Run script"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
