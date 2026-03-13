/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ToggleField } from '../toggle_field';

// TODO - this is not working yet
export const EnrichOverrideToggle = () => {
  return (
    <ToggleField
      name="override"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.enrichOverrideLabel',
        { defaultMessage: 'Override pre-existing field values.' }
      )}
    />
  );
};
