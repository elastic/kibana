/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MANAGEMENT_RULES_V1_TAB_PATH } from '../constants';

export const RULES_V1_TAB_TEST_SUBJ = 'rulesV1Tab';
export const RULES_V2_TAB_TEST_SUBJ = 'rulesV2Tab';
export const RULES_V2_TABS_TEST_SUBJ = 'rulesV2Tabs';

const isV1TabPath = (pathname: string): boolean =>
  pathname === MANAGEMENT_RULES_V1_TAB_PATH ||
  pathname.startsWith(`${MANAGEMENT_RULES_V1_TAB_PATH}/`);

/**
 * EUI tab chrome for `/app/management/rules`. The v1 tab embeds the classic
 * Rules app; the v2 tab renders the alerting v2 rules UI.
 */
export const RulesV2TabLayout = ({ children }: { children: React.ReactNode }) => {
  const history = useHistory();
  const { pathname } = useLocation();
  const isV1Selected = isV1TabPath(pathname);

  return (
    <>
      <EuiTabs data-test-subj={RULES_V2_TABS_TEST_SUBJ}>
        <EuiTab
          isSelected={isV1Selected}
          onClick={() => history.push(MANAGEMENT_RULES_V1_TAB_PATH)}
          data-test-subj={RULES_V1_TAB_TEST_SUBJ}
        >
          <FormattedMessage
            id="xpack.alertingV2.rulesApp.rulesV1TabTitle"
            defaultMessage="Rules V1"
          />
        </EuiTab>
        <EuiTab
          isSelected={!isV1Selected}
          onClick={() => history.push('/')}
          data-test-subj={RULES_V2_TAB_TEST_SUBJ}
        >
          <FormattedMessage
            id="xpack.alertingV2.rulesApp.rulesV2TabTitle"
            defaultMessage="Rules V2"
          />
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {children}
    </>
  );
};
