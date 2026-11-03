/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface InlineCalloutTitleProps {
  /** The state, in the callout's own bold title weight. */
  title: string;
  /** The detail, on the same line in regular weight. */
  description?: React.ReactNode;
}

/** The one-line title every proposal callout uses: "**Failed** • HTTP 500: host unreachable". */
export const InlineCalloutTitle = ({ title, description }: InlineCalloutTitleProps) => {
  const { euiTheme } = useEuiTheme();

  if (!description) {
    return <>{title}</>;
  }

  return (
    <>
      {title}
      <span css={css({ fontWeight: euiTheme.font.weight.regular })}>
        {' • '}
        {description}
      </span>
    </>
  );
};
