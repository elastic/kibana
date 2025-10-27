/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiSwitch, EuiSpacer, EuiPanel, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JsonEditor, EDITOR_MODE } from './json_editor';

interface Props {
  settings: IndicesIndexSettings;
  setSettings?: (settings: string) => void;
  readonly?: boolean;
}

export const Settings: FC<Props> = ({ settings, setSettings, readonly = false }) => {
  const { euiTheme } = useEuiTheme();
  const [localSettings, setLocalSettings] = useState(JSON.stringify(settings, null, 2));
  const [showSettings, setShowSettings] = useState<boolean>(false);

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

  const css = useMemo(
    () => (readonly ? {} : { backgroundColor: euiTheme.colors.backgroundBaseSubdued }),
    [euiTheme, readonly]
  );

  return (
    <>
      <EuiSwitch
        id={'containsTimeField'}
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.customizeIndexSettingsLabel"
            defaultMessage="Customize index settings"
          />
        }
        checked={showSettings}
        onChange={(e) => setShowSettings(e.target.checked)}
      />

      <EuiSpacer size="m" />

      {showSettings ? (
        <EuiPanel
          hasShadow={false}
          hasBorder={true}
          paddingSize="none"
          data-test-subj="dvSettingsEditor"
          css={css}
        >
          <JsonEditor
            mode={EDITOR_MODE.JSON}
            readOnly={readonly}
            value={localSettings}
            onChange={(value) => {
              setLocalSettings(value);
            }}
            transparentBackground={readonly === false}
            width="100%"
          />
        </EuiPanel>
      ) : null}
    </>
  );
};
