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
  lineNumbers?: boolean;
  background?: 'plain' | 'subdued';
}

export const JsonCodeBlock: React.FC<JsonCodeBlockProps> = ({
  data,
  lineNumbers = true,
  background = 'plain',
}) => {
  const { euiTheme } = useEuiTheme();
  const formattedJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const backgroundColor =
    background === 'subdued'
      ? euiTheme.colors.backgroundBaseSubdued
      : euiTheme.colors.backgroundBasePlain;
  const styles = css`
    word-break: break-word;
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${backgroundColor};
  `;
  return (
    <EuiCodeBlock
      language="json"
      paddingSize="s"
      fontSize="s"
      isCopyable
      lineNumbers={lineNumbers}
      css={styles}
    >
      {formattedJson}
    </EuiCodeBlock>
  );
};
