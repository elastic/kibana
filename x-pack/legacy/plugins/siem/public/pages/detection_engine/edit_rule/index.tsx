/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

import { HeaderPage } from '../../../components/header_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';

export const EditRuleComponent = React.memo(() => {
  return (
    <>
      <HeaderPage
        backLink="#detection-engine/rules/rule-details"
        backText="Back to automated exfiltration"
        title={i18n.PAGE_TITLE}
      >
        <EuiButton fill href="#/detection-engine/rules/rule-details" iconType="save">
          {'Save changes'}
        </EuiButton>
      </HeaderPage>

      <SpyRoute />
    </>
  );
});
EditRuleComponent.displayName = 'EditRuleComponent';
