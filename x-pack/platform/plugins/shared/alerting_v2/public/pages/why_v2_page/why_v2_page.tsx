/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { WhyV2DocsFooter } from './why_v2_docs_footer';
import { WhyV2DynamicMarkdown } from './why_v2_dynamic_markdown';
import { WhyV2Hero } from './why_v2_hero';
import { WhyV2Highlights } from './why_v2_highlights';
import { WhyV2QuickStart } from './why_v2_quick_start';
import { WhyV2Spotlights } from './why_v2_spotlight';
import { whyV2PageStyles } from './why_v2_page.styles';

export const WhyV2Page = () => {
  useBreadcrumbs('why_v2');
  const theme = useEuiTheme();

  return (
    <div css={whyV2PageStyles.page(theme)} data-test-subj="whyV2Page">
      <WhyV2Hero />
      <EuiSpacer size="xl" />
      <WhyV2Spotlights />
      <EuiSpacer size="xxl" />
      <WhyV2Highlights />
      <EuiHorizontalRule margin="xl" />
      <WhyV2QuickStart />
      <WhyV2DynamicMarkdown />
      <WhyV2DocsFooter />
    </div>
  );
};
