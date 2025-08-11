/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InputOverrides } from '@kbn/file-upload-plugin/common';
import type { FileAnalysis } from '@kbn/file-upload';
import { EditFlyout } from './edit_flyout';

interface Props {
  fileStatus: FileAnalysis;
  analyzeFileWithOverrides: (overrides: InputOverrides) => void;
}
export const AnalysisOverrides: FC<Props> = ({ fileStatus, analyzeFileWithOverrides }) => {
  const [isEditFlyoutVisible, setIsEditFlyoutVisible] = React.useState(false);
  const fields = Object.keys(fileStatus.results?.field_stats ?? {});

  if (fileStatus.serverSettings === null) {
    return null;
  }

  return (
    <>
      <EuiSpacer />

      <EuiButton onClick={() => setIsEditFlyoutVisible(true)}>
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.editButtonLabel"
          defaultMessage="Override settings"
        />
      </EuiButton>
      <EditFlyout
        setOverrides={analyzeFileWithOverrides}
        closeEditFlyout={() => setIsEditFlyoutVisible(false)}
        isFlyoutVisible={isEditFlyoutVisible}
        originalSettings={fileStatus.serverSettings}
        overrides={fileStatus.overrides}
        fields={fields}
      />
    </>
  );
};
