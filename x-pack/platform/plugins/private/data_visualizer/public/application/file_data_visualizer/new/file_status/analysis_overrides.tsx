/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import type { InputOverrides } from '@kbn/file-upload-plugin/common';
import type { FileAnalysis } from '@kbn/file-upload';
import { i18n } from '@kbn/i18n';
import { EditFlyout } from './edit_flyout';

interface Props {
  fileStatus: FileAnalysis;
  analyzeFileWithOverrides: (overrides: InputOverrides) => void;
}
export const AnalysisOverrides: FC<Props> = ({ fileStatus, analyzeFileWithOverrides }) => {
  const [isEditFlyoutVisible, setIsEditFlyoutVisible] = useState(false);
  const fields = Object.keys(fileStatus.results?.field_stats ?? {});

  if (fileStatus.serverSettings === null) {
    return null;
  }

  return (
    <>
      <EuiButtonIcon
        onClick={() => setIsEditFlyoutVisible(true)}
        iconType="gear"
        size="xs"
        color="text"
        aria-label={i18n.translate('xpack.dataVisualizer.file.analysisSummary.editButtonLabel', {
          defaultMessage: 'Override settings',
        })}
      />

      <EditFlyout
        setOverrides={analyzeFileWithOverrides}
        closeEditFlyout={() => setIsEditFlyoutVisible(false)}
        isFlyoutVisible={isEditFlyoutVisible}
        fileStatus={fileStatus}
        fields={fields}
      />
    </>
  );
};
