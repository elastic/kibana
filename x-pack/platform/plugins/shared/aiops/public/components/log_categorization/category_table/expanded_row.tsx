/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import { EuiText, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import { FormattedPatternExamples, FormattedRegex, FormattedTokens } from '../format_category';

interface ExpandedRowProps {
  category: Category;
  displayExamples?: boolean;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ category, displayExamples = true }) => {
  const { euiTheme } = useEuiTheme();
  const cssExpandedRow = css({
    marginRight: euiTheme.size.xxl,
    width: '100%',
  });

  return (
    <div css={cssExpandedRow}>
      <EuiSpacer />

      <Section
        title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.tokens', {
          defaultMessage: 'Tokens',
        })}
      >
        <FormattedTokens category={category} />
      </Section>

      <Section
        title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.regex', {
          defaultMessage: 'Regex',
        })}
      >
        <FormattedRegex category={category} />
      </Section>

      {displayExamples ? (
        <Section
          title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.examples', {
            defaultMessage: 'Examples',
          })}
        >
          <FormattedPatternExamples category={category} />
        </Section>
      ) : null}
    </div>
  );
};

const Section: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  return (
    <>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {children}
      <EuiSpacer />
    </>
  );
};
