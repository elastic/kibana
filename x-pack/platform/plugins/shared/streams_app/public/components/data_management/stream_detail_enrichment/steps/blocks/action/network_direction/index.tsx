/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { SourceIpField } from './network_direction_inputs';
import { DestinationIpField } from './network_direction_inputs';
import { NetworkDirectionTargetField } from './network_direction_inputs';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { FieldsAccordion } from '../optional_fields_accordion';

export const NetworkDirectionProcessorForm = () => {
  return (
    <>
      <SourceIpField />
      <DestinationIpField />
      <NetworkDirectionTargetField />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreMissingToggle />
      <IgnoreFailureToggle />
    </>
  );
};
