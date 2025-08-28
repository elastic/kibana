/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiCallOut, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { JsonEditor, EDITOR_MODE } from './json_editor';

interface Props {
  mappings: MappingTypeMapping;
  setMappings?: (mappings: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
  fileCount?: number;
}

export const Mappings: FC<Props> = ({
  mappings,
  setMappings,
  showTitle,
  readonly = false,
  fileCount = 1,
}) => {
  const [localMappings, setLocalMappings] = useState(JSON.stringify(mappings, null, 2));

  useEffect(() => {
    setLocalMappings(JSON.stringify(mappings, null, 2));
  }, [mappings]);

  useDebounce(
    () => {
      if (setMappings) {
        const mOriginal = JSON.stringify(mappings);
        const mLocal = JSON.stringify(JSON.parse(localMappings));
        if (mOriginal !== mLocal) {
          setMappings(localMappings);
        }
      }
    },
    500,
    [localMappings]
  );

  const editor = (
    <JsonEditor
      mode={EDITOR_MODE.JSON}
      readOnly={readonly}
      value={localMappings}
      onChange={(value) => {
        setLocalMappings(value);
      }}
    />
  );

  const title =
    fileCount > 1 ? (
      <FormattedMessage
        id="xpack.dataVisualizer.file.advancedImportSettings.mappingsLabel"
        defaultMessage="Combined mappings"
      />
    ) : (
      <FormattedMessage
        id="xpack.dataVisualizer.file.advancedImportSettings.singleFileMappingLabel"
        defaultMessage="Mappings"
      />
    );

  return (
    <>
      {readonly ? (
        <EuiCallOut
          size="s"
          color="primary"
          iconType="readOnly"
          title={i18n.translate('xpack.dataVisualizer.file.mappingsReadonlyWarning', {
            defaultMessage: 'Mappings for individual files are not editable.',
          })}
        >
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.mappingsWarning"
            defaultMessage="You can only edit combined mappings under advanced options. Go to advanced options"
          />
        </EuiCallOut>
      ) : null}
      {showTitle ? (
        <EuiFormRow label={title} fullWidth>
          {editor}
        </EuiFormRow>
      ) : (
        editor
      )}
    </>
  );
};
