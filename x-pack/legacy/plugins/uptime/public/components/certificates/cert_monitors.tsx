/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Cert } from '../../../common/runtime_types';
import { MonitorPageLink } from '../common/monitor_page_link';

interface Props {
  monitors: Cert;
}

export const CertMonitors: React.FC<Props> = ({ monitors }) => {
  return (
    <span>
      {monitors.map((mon, ind) => (
        <>
          {ind > 0 && ', '}
          <MonitorPageLink key={mon.id} monitorId={mon.id} linkParameters={''}>
            {mon.name || mon.id}
          </MonitorPageLink>
        </>
      ))}
    </span>
  );
};
