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
  /** The state word, in the callout's own bold title. */
  title: string;
  /** Detail on the same line, in regular weight; omitted when the title says it all. */
  description?: React.ReactNode;
}

/**
 * The title every proposal callout uses: "Title • description" on one line. EUI's own title stays
 * bold; only the description is set back to regular weight, so the state word reads first.
 */
export const InlineCalloutTitle = ({ title, description }: InlineCalloutTitleProps) => {
  const { euiTheme } = useEuiTheme();

  return description ? (
    <>
      {title}
      <span css={css({ fontWeight: euiTheme.font.weight.regular })}>
        {' • '}
        {description}
      </span>
    </>
  ) : (
    <>{title}</>
  );
};
