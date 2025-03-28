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
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Mappings as MappingsEditor } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  mappings: MappingTypeMapping;
  setMappings?: (mappings: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
}

export const Mappings: FC<Props> = ({ mappings, setMappings, showTitle, readonly = false }) => {
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

  return (
    <>
      {readonly ? (
        <EuiCallOut
          size="s"
          color="primary"
          title={i18n.translate('xpack.dataVisualizer.file.mappingsReadonlyWarning', {
            defaultMessage:
              'Mappings for individual files are not editable. You can only edit the common mappings in the advanced section below.',
          })}
        />
      ) : null}
      <MappingsEditor
        initialized={readonly}
        data={localMappings}
        onChange={(value) => {
          setLocalMappings(value);
        }}
        indexName={''}
        showTitle={showTitle}
      />
    </>
  );
};
