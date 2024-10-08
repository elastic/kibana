/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../../../translations';
import { CalloutItem } from '../../styles';

interface Props {
  children?: React.ReactNode;
}

const MissingTimestampCalloutComponent: React.FC<Props> = ({ children }) => (
  <EuiCallOut color="danger" size="s" title={i18n.MISSING_TIMESTAMP_CALLOUT_TITLE}>
    <div>{i18n.MISSING_TIMESTAMP_CALLOUT}</div>
    <EuiSpacer size="s" />
    <CalloutItem>{i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}</CalloutItem>
    <CalloutItem>{i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}</CalloutItem>
    <EuiSpacer size="s" />
    {children}
  </EuiCallOut>
);

MissingTimestampCalloutComponent.displayName = 'MissingTimestampCalloutComponent';

export const MissingTimestampCallout = React.memo(MissingTimestampCalloutComponent);
