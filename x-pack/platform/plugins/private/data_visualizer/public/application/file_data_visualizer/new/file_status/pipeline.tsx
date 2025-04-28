/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { IngestPipeline as IngestPipelineType } from '@kbn/file-upload-plugin/common/types';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JsonEditor, EDITOR_MODE } from './json_editor';

interface Props {
  pipeline: IngestPipelineType;
  setPipeline?: (pipeline: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
}

export const IngestPipeline: FC<Props> = ({
  pipeline,
  setPipeline,
  showTitle = true,
  readonly = false,
}) => {
  const [localPipeline, setLocalPipeline] = useState(JSON.stringify(pipeline, null, 2));

  useEffect(() => {
    setLocalPipeline(JSON.stringify(pipeline, null, 2));
  }, [pipeline]);

  useDebounce(
    () => {
      if (setPipeline && pipeline !== undefined) {
        const pOriginal = JSON.stringify(pipeline);
        const pLocal = JSON.stringify(JSON.parse(localPipeline));
        if (pOriginal !== pLocal) {
          setPipeline(localPipeline);
        }
      }
    },
    500,
    [localPipeline]
  );

  const editor = (
    <JsonEditor
      mode={EDITOR_MODE.JSON}
      readOnly={readonly}
      value={localPipeline}
      onChange={(value) => {
        setLocalPipeline(value);
      }}
    />
  );

  return showTitle ? (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.dataVisualizer.file.advancedImportSettings.ingestPipelineLabel"
          defaultMessage="Ingest pipeline"
        />
      }
      fullWidth
    >
      {editor}
    </EuiFormRow>
  ) : (
    editor
  );
};
