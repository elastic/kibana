/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FunctionComponent, ReactNode } from 'react';
import React from 'react';
import { EuiTitle, useEuiTheme } from '@elastic/eui';

export interface MappingSubsectionTitleProps {
  title: string;
  'data-test-subj': string;
  trailing?: ReactNode;
}

/** Section heading used in Flow 3 9.6 mapped-fields subsections (e.g. timestamp, field list). */
export const MappingSubsectionTitle: FunctionComponent<MappingSubsectionTitleProps> = ({
  title,
  'data-test-subj': dataTestSubj,
  trailing,
}) => {
  const { euiTheme } = useEuiTheme();

  const titleRowCss = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    flex-wrap: wrap;
  `;

  return (
    <div css={titleRowCss} data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h5>{title}</h5>
      </EuiTitle>
      {trailing}
    </div>
  );
};
