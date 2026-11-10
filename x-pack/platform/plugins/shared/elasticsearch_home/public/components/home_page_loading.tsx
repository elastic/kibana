/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Stands in for everything below the header until the stats load, so the page never shows a card
 * the user may turn out not to be allowed to see, and nothing moves once the content arrives.
 */
export const HomePageLoading = () => (
  <>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup justifyContent="center">
      <EuiLoadingSpinner
        size="xl"
        aria-label={i18n.translate('xpack.elasticsearchHome.home.loading.ariaLabel', {
          defaultMessage: 'Loading the home page',
        })}
        data-test-subj="homePageLoading"
      />
    </EuiFlexGroup>
  </>
);
