/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface JsonCodeBlockProps {
  data: unknown;
}

export const JsonCodeBlock: React.FC<JsonCodeBlockProps> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const formattedJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const styles = css`
    word-break: break-word;
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  return (
    <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable lineNumbers css={styles}>
      {formattedJson}
    </EuiCodeBlock>
  );
};
