/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../../../translations';
import { CalloutItem } from '../../styles';

const IncompatibleCalloutComponent: React.FC = () => {
  return (
    <EuiCallOut color="danger" data-test-subj="incompatibleCallout" size="s">
      <div data-test-subj="fieldsAreIncompatible">{i18n.INCOMPATIBLE_CALLOUT(EcsVersion)}</div>
      <EuiSpacer size="xs" />
      <CalloutItem data-test-subj="rulesMayNotMatch">
        {i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
      </CalloutItem>
      <CalloutItem data-test-subj="pagesMayNotDisplayEvents">
        {i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
      </CalloutItem>
      <CalloutItem data-test-subj="mappingsThatDontComply">
        {i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}
      </CalloutItem>
    </EuiCallOut>
  );
};

IncompatibleCalloutComponent.displayName = 'IncompatibleCalloutComponent';

export const IncompatibleCallout = React.memo(IncompatibleCalloutComponent);
