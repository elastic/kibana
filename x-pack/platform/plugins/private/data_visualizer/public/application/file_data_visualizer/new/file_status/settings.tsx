/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JsonEditor, EDITOR_MODE } from './json_editor';

interface Props {
  settings: IndicesIndexSettings;
  setSettings?: (settings: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
}

export const Settings: FC<Props> = ({ settings, setSettings, showTitle, readonly = false }) => {
  const [localSettings, setLocalSettings] = useState(JSON.stringify(settings, null, 2));

  useEffect(() => {
    setLocalSettings(JSON.stringify(settings, null, 2));
  }, [settings]);

  useDebounce(
    () => {
      if (setSettings) {
        setSettings(localSettings);
      }
    },
    100,
    [localSettings]
  );

  const editor = (
    <JsonEditor
      mode={EDITOR_MODE.JSON}
      readOnly={readonly}
      value={localSettings}
      onChange={(value) => {
        setLocalSettings(value);
      }}
    />
  );

  return showTitle ? (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.dataVisualizer.file.advancedImportSettings.indexSettingsLabel"
          defaultMessage="Index settings"
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
