/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getIntegrationInfoByKey } from '../data';
import { IntegrationInfo } from '../../common/types';

export function Detail(props: { package: string }) {
  const [info, setInfo] = useState<IntegrationInfo | null>(null);
  useEffect(() => {
    getIntegrationInfoByKey(props.package).then(setInfo);
  }, [props.package]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <InfoPanel {...info} />;
}

function InfoPanel(info: IntegrationInfo) {
  const { description, name, version } = info;

  return (
    <EuiPanel>
      <EuiTitle>
        <h1>{`${name} (v${version})`}</h1>
      </EuiTitle>
      <EuiSpacer />
      <p>{description}</p>
    </EuiPanel>
  );
}
