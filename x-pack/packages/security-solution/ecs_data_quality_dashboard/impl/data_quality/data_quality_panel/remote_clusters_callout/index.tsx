/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

const RemoteClustersCalloutComponent: React.FC = () => (
  <EuiCallOut data-test-subj="remoteClustersCallout" color="primary" size="s" title={i18n.TITLE}>
    <p>{i18n.TO_CHECK_INDICES_ON_REMOTE_CLUSTERS}</p>
  </EuiCallOut>
);

RemoteClustersCalloutComponent.displayName = 'RemoteClustersCalloutComponent';

export const RemoteClustersCallout = React.memo(RemoteClustersCalloutComponent);
