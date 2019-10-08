/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

export const DetectionEngineKql = React.memo(() => (
  <EuiFieldSearch aria-label={i18n.KQL_ARIA_LABEL} fullWidth placeholder={i18n.KQL_PLACEHOLDER} />
));
DetectionEngineKql.displayName = 'DetectionEngineKql';
