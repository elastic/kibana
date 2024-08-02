/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from '../../../index_properties/translations';
import { CalloutItem } from '../../styles';
import type { EcsBasedFieldMetadata } from '../../../../types';

interface Props {
  children?: React.ReactNode;
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[];
}

const IncompatibleCalloutComponent: React.FC<Props> = ({ children, ecsBasedFieldMetadata }) => {
  const fieldCount = ecsBasedFieldMetadata.length;
  const title = useMemo(
    () => <span data-test-subj="title">{i18n.INCOMPATIBLE_CALLOUT_TITLE(fieldCount)}</span>,
    [fieldCount]
  );

  return (
    <EuiCallOut color="danger" data-test-subj="incompatibleCallout" size="s" title={title}>
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
      <EuiSpacer size="s" />
      {children}
    </EuiCallOut>
  );
};
IncompatibleCalloutComponent.displayName = 'IncompatibleCalloutComponent';

export const IncompatibleCallout = React.memo(IncompatibleCalloutComponent);
