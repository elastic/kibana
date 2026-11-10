/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { css } from '@emotion/react';
import { extractCategorizeTokens } from '@kbn/esql-utils';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  pattern: string;
}

export const PatternCellRenderer: FC<Props> = ({ pattern }) => {
  const styles = useMemoCss(componentStyles);

  const keywords = useMemo(() => extractCategorizeTokens(pattern), [pattern]);

  const formattedTokens = useMemo(
    () =>
      keywords.map((keyword, index) => {
        return (
          <EuiCode key={index} css={styles.keyword}>
            {keyword}
          </EuiCode>
        );
      }),
    [styles, keywords]
  );

  return <div>{formattedTokens}</div>;
};

const componentStyles = {
  keyword: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginRight: euiTheme.size.xs,
      marginBottom: `calc(${euiTheme.size.m} / 2)`,
      display: 'inline-block',
      padding: `${euiTheme.size.xxs} ${euiTheme.size.s}`,
      backgroundColor: euiTheme.colors.lightestShade,
      borderRadius: euiTheme.border.radius.small,
      color: euiTheme.colors.textPrimary,
      fontSize: euiTheme.size.m,
    }),
};
