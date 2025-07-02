/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { Title } from './title';
import { useCasesContext } from '../cases_context/use_cases_context';
import { IncrementalIdText } from '../incremental_id';

interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

export interface HeaderPageProps extends HeaderProps {
  children?: React.ReactNode;
  title: string | React.ReactNode;
  titleNode?: React.ReactElement;
  incrementalId?: number | null;
  'data-test-subj'?: string;
}

const getHeaderCss = (euiTheme: EuiThemeComputed<{}>, border?: boolean) => css`
  margin-bottom: ${euiTheme.size.l};
  ${border &&
  css`
    border-bottom: ${euiTheme.border.thin};
    padding-bottom: ${euiTheme.size.l};
    .euiProgress {
      top: ${euiTheme.size.l};
    }
  `}
`;

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  border,
  children,
  isLoading,
  title,
  titleNode,
  incrementalId,
  'data-test-subj': dataTestSubj,
}) => {
  const { releasePhase, settings } = useCasesContext();
  const { euiTheme } = useEuiTheme();

  return (
    <header css={getHeaderCss(euiTheme, border)} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {settings.displayIncrementalCaseId && incrementalId && (
          <IncrementalIdText incrementalId={incrementalId} />
        )}
        <EuiFlexItem
          css={css`
            overflow: hidden;
            display: block;
          `}
        >
          {titleNode || <Title title={title} releasePhase={releasePhase} />}

          {border && isLoading && <EuiProgress size="xs" color="accent" />}
        </EuiFlexItem>

        {children && (
          <EuiFlexItem
            data-test-subj="header-page-supplements"
            css={css`
              display: block;
            `}
            grow={false}
          >
            {children}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </header>
  );
};
HeaderPageComponent.displayName = 'HeaderPage';

export const HeaderPage = React.memo(HeaderPageComponent);
