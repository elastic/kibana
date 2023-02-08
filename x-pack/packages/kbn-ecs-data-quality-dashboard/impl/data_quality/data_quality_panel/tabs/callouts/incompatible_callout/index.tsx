/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { EnrichedFieldMetadata } from '../../../../types';

import * as i18n from '../../../index_properties/translations';
import { CalloutItem } from '../../styles';

interface Props {
  children?: React.ReactNode;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}

const IncompatibleCalloutComponent: React.FC<Props> = ({ children, enrichedFieldMetadata }) => (
  <EuiCallOut
    color="danger"
    size="s"
    title={i18n.INCOMPATIBLE_CALLOUT_TITLE(enrichedFieldMetadata.length)}
  >
    <div>
      {i18n.INCOMPATIBLE_CALLOUT({
        fieldCount: enrichedFieldMetadata.length,
        version: EcsVersion,
      })}
    </div>
    <EuiSpacer size="s" />
    <CalloutItem>{i18n.DETECTION_ENGINE_RULES_WONT_WORK}</CalloutItem>
    <CalloutItem>{i18n.PAGES_WONT_DISPLAY_EVENTS}</CalloutItem>
    <CalloutItem>{i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}</CalloutItem>
    <EuiSpacer size="s" />
    {children}
  </EuiCallOut>
);

IncompatibleCalloutComponent.displayName = 'IncompatibleCalloutComponent';

export const IncompatibleCallout = React.memo(IncompatibleCalloutComponent);
