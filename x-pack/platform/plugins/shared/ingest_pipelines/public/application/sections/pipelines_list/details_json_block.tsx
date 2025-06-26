/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useRef } from 'react';
import { EuiCodeBlock } from '@elastic/eui';

export interface Props {
  json: Record<string, any>;
}

export const PipelineDetailsJsonBlock: FunctionComponent<Props> = ({ json }) => {
  // Hack so copied-to-clipboard value updates as content changes
  // Related issue: https://github.com/elastic/eui/issues/3321
  const uuid = useRef(0);
  uuid.current++;

  // Convert JSON object to string
  const jsonString = JSON.stringify(json, null, 2);
  // Replace all newline characters with empty spaces
  const formattedString = jsonString.replace(/\\n/g, ' ');

  return (
    <EuiCodeBlock
      paddingSize="s"
      language="json"
      overflowHeight={json.length > 0 ? 300 : undefined}
      isCopyable
      key={uuid.current}
      data-test-subj="jsonCodeBlock"
    >
      {formattedString}
    </EuiCodeBlock>
  );
};
