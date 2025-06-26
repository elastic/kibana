/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { MultiPageStepLayoutProps } from '../../types';
import { useStartServices } from '../../../../../../hooks';

import {
  ConfirmIncomingDataWithPreview,
  ConfirmIncomingDataStandalone,
  CreatePackagePolicyFinalBottomBar,
  NotObscuredByBottomBar,
} from '..';

export const ConfirmDataPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const { enrolledAgentIds, packageInfo, isManaged } = props;
  const core = useStartServices();

  const [agentDataConfirmed, setAgentDataConfirmed] = useState(false);
  const { docLinks } = core;
  const troubleshootLink = docLinks.links.fleet.troubleshooting;

  const bottomBar = (
    <>
      <NotObscuredByBottomBar />
      <CreatePackagePolicyFinalBottomBar pkgkey={`${packageInfo.name}-${packageInfo.version}`} />
    </>
  );

  if (!isManaged) {
    return (
      <>
        <ConfirmIncomingDataStandalone troubleshootLink={troubleshootLink} />
        {bottomBar}
      </>
    );
  }

  return (
    <>
      <ConfirmIncomingDataWithPreview
        agentIds={enrolledAgentIds}
        packageInfo={packageInfo}
        agentDataConfirmed={agentDataConfirmed}
        setAgentDataConfirmed={setAgentDataConfirmed}
        troubleshootLink={troubleshootLink}
      />

      {!!agentDataConfirmed && bottomBar}
    </>
  );
};
