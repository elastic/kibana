/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ReactNode } from 'react';
import React from 'react';

export const CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ = 'contextEngineBackButton';

interface ContextEngineSubPageHeaderProps {
  backLabel: string;
  backHref: string;
  onBackClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  pageTitle: ReactNode;
  description?: ReactNode;
  'data-test-subj'?: string;
}

export const ContextEngineSubPageHeader = ({
  backLabel,
  backHref,
  onBackClick,
  pageTitle,
  description,
  'data-test-subj': dataTestSubj,
}: ContextEngineSubPageHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <SuppressChromeBackButton />
      <KibanaPageTemplate.Header
        data-test-subj={dataTestSubj}
        pageTitle={pageTitle}
        description={description}
        restrictWidth
        bottomBorder={false}
        breadcrumbs={[
          {
            text: (
              <>
                <EuiIcon size="s" type="chevronSingleLeft" aria-hidden /> {backLabel}
              </>
            ),
            href: backHref,
            onClick: onBackClick,
            color: 'primary',
            'aria-current': false,
            'data-test-subj': CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ,
          },
        ]}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `}
      />
    </>
  );
};
