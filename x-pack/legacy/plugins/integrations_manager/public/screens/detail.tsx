/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiSpacer, EuiTitle } from '@elastic/eui';
import { PLUGIN } from '../../common/constants';
import { IntegrationInfo } from '../../common/types';
import { getIntegrationInfoByKey } from '../data';
import { useBreadcrumbs, useLinks } from '../hooks';

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
  const { description, version } = info;
  // TODO: Need title or something which uses correct capitalization (e.g. PostgreSQL)
  const title = description.split(' ')[0];
  const links = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: links.toListView() }, { text: title }]);

  return (
    <EuiPage restrictWidth={1200}>
      <EuiPageBody>
        <EuiTitle>
          <h1>{`${title} (v${version})`}</h1>
        </EuiTitle>
        <EuiSpacer />
        <p>{description}</p>
      </EuiPageBody>
    </EuiPage>
  );
}
