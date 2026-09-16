/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ActionPolicyFormState } from '../types';
import { DispatchConfigSummary } from './dispatch_config_summary';
import { DispatchSection } from './dispatch_section';

/**
 * Notification controls without the dispatch diagram (Empty / AP improv prototypes).
 */
export const ClassicNotificationControlsSection = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const [groupingMode, groupBy, throttleStrategy, throttleInterval] = useWatch({
    control,
    name: ['groupingMode', 'groupBy', 'throttleStrategy', 'throttleInterval'],
  });

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.dispatch.title"
              defaultMessage="Notification controls"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <DispatchConfigSummary
          groupingMode={groupingMode}
          groupBy={groupBy}
          throttleStrategy={throttleStrategy}
          throttleInterval={throttleInterval}
        />
      }
    >
      <DispatchSection />
    </EuiDescribedFormGroup>
  );
};
