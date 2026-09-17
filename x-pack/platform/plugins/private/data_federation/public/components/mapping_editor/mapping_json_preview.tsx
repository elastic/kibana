/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface MappingJsonPreviewProps {
  json: string;
}

const FALLBACK_REQUEST_SNIPPET =
  '{\n  "mappings": {\n    "dynamic": "false",\n    "properties": {\n      "@timestamp": {\n        "type": "date",\n        "path": "event_time",\n        "format": "yyyy-MM-dd HH:mm:ss"\n      }\n    }\n  }\n}';

export const MappingJsonPreview = ({ json }: MappingJsonPreviewProps) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.dataFederation.mappingEditor.previewTitle', {
            defaultMessage: 'Request snippet',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="json" isCopyable paddingSize="s">
        {json || FALLBACK_REQUEST_SNIPPET}
      </EuiCodeBlock>
    </>
  );
};

