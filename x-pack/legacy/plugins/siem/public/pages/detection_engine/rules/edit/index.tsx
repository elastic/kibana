/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import React, { memo } from 'react';

import { HeaderPage } from '../../../../components/header_page';
import { HeaderSection } from '../../../../components/header_section';
import { WrapperPage } from '../../../../components/wrapper_page';
import { SpyRoute } from '../../../../utils/route/spy_routes';
import * as i18n from './translations';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';

const Define = React.memo(() => (
  <>
    <EuiSpacer />

    <EuiPanel>
      <HeaderSection title="Define rule" />
    </EuiPanel>
  </>
));
Define.displayName = 'Define';

const About = React.memo(() => (
  <>
    <EuiSpacer />

    <EuiPanel>
      <HeaderSection title="About rule" />
    </EuiPanel>
  </>
));
About.displayName = 'About';

const Schedule = React.memo(() => (
  <>
    <EuiSpacer />

    <EuiPanel>
      <HeaderSection title="Schedule rule" />
    </EuiPanel>
  </>
));
Schedule.displayName = 'Schedule';

interface EditRuleComponent {
  ruleId: string;
}

export const EditRuleComponent = memo<EditRuleComponent>(({ ruleId }) => {
  return (
    <>
      <WrapperPage restrictWidth>
        <HeaderPage
          backOptions={{
            href: `#/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`,
            text: 'Back to automated exfiltration',
          }}
          title={i18n.PAGE_TITLE}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton href={`#/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`} iconType="cross">
                {'Cancel'}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                href={`#/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`}
                iconType="save"
              >
                {'Save changes'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>

        <EuiTabbedContent
          tabs={[
            {
              id: 'tabDefine',
              name: 'Define',
              content: <Define />,
            },
            {
              id: 'tabAbout',
              name: 'About',
              content: <About />,
            },
            {
              id: 'tabSchedule',
              name: 'Schedule',
              content: <Schedule />,
            },
          ]}
        />

        <EuiSpacer />

        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          justifyContent="flexEnd"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton href="#/detection-engine/rules/rule-details" iconType="cross">
              {'Cancel'}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton fill href="#/detection-engine/rules/rule-details" iconType="save">
              {'Save changes'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
EditRuleComponent.displayName = 'EditRuleComponent';
