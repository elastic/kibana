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
import { IndexSettings } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

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

  return (
    <IndexSettings
      initialized={readonly}
      data={localSettings}
      onChange={(value) => {
        setLocalSettings(value);
      }}
      indexName={''}
      showTitle={showTitle}
    />
  );
};
