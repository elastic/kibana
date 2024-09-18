/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { PageTitle } from './page_title';
import { AttackDiscoveryUpsellingSection } from '../../sections/attack_discovery';

interface Props {
  actions?: React.ReactNode;
  availabilityMessage: string;
  upgradeMessage: string;
}

/**
 * This component handles the styling of the _page_ that hosts the `AttackDiscoveryUpsellingSection`
 */
const AttackDiscoveryUpsellingPageComponent: React.FC<Props> = ({
  actions,
  availabilityMessage,
  upgradeMessage,
}) => {
  const pageTitle = useMemo(() => <PageTitle />, []);

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader bottomBorder pageTitle={pageTitle} />
        <EuiSpacer size="xxl" />
        <AttackDiscoveryUpsellingSection
          actions={actions}
          availabilityMessage={availabilityMessage}
          upgradeMessage={upgradeMessage}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

AttackDiscoveryUpsellingPageComponent.displayName = 'AttackDiscoveryUpsellingPage';

export const AttackDiscoveryUpsellingPage = React.memo(AttackDiscoveryUpsellingPageComponent);
