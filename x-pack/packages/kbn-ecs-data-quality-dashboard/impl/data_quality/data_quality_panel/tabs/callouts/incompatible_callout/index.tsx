/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import { getIncompatiableFieldsInSameFamilyCount } from './helpers';
import * as i18n from '../../../index_properties/translations';
import { CalloutItem } from '../../styles';
import type { EnrichedFieldMetadata } from '../../../../types';

interface Props {
  children?: React.ReactNode;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}

const IncompatibleCalloutComponent: React.FC<Props> = ({ children, enrichedFieldMetadata }) => {
  const fieldCount = enrichedFieldMetadata.length;
  const fieldsInSameFamily = getIncompatiableFieldsInSameFamilyCount(enrichedFieldMetadata);
  const title = useMemo(
    () => (
      <span data-test-subj="title">
        {i18n.INCOMPATIBLE_CALLOUT_TITLE({ fieldCount, fieldsInSameFamily })}
      </span>
    ),
    [fieldCount, fieldsInSameFamily]
  );

  return (
    <EuiCallOut color="danger" data-test-subj="incompatibleCallout" size="s" title={title}>
      <div data-test-subj="fieldsAreIncompatible">
        {i18n.INCOMPATIBLE_CALLOUT({
          fieldCount: enrichedFieldMetadata.length,
          version: EcsVersion,
        })}
      </div>
      <EuiSpacer size="s" />
      <div>
        <EuiText data-test-subj="incompatibleFIeldsWith" size="xs">
          {i18n.INCOMPATIBLE_FIELDS_WITH}
        </EuiText>
      </div>
      <EuiSpacer size="xs" />
      <div>
        <EuiText data-test-subj="whenAnIncompatableField" size="xs">
          {i18n.WHEN_AN_INCOMPATIBLE_FIELD}
        </EuiText>
      </div>
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
