/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../../../../../../../../../translations';
import { CalloutItem } from '../../styles';
import {
  MISSING_TIMESTAMP_CALLOUT,
  MISSING_TIMESTAMP_CALLOUT_TITLE,
} from '../../../../translations';

interface Props {
  children?: React.ReactNode;
}

const MissingTimestampCalloutComponent: React.FC<Props> = ({ children }) => (
  <EuiCallOut color="danger" size="s" title={MISSING_TIMESTAMP_CALLOUT_TITLE}>
    <div>{MISSING_TIMESTAMP_CALLOUT}</div>
    <EuiSpacer size="s" />
    <CalloutItem>{DETECTION_ENGINE_RULES_MAY_NOT_MATCH}</CalloutItem>
    <CalloutItem>{PAGES_MAY_NOT_DISPLAY_EVENTS}</CalloutItem>
    <EuiSpacer size="s" />
    {children}
  </EuiCallOut>
);

MissingTimestampCalloutComponent.displayName = 'MissingTimestampCalloutComponent';

export const MissingTimestampCallout = React.memo(MissingTimestampCalloutComponent);
