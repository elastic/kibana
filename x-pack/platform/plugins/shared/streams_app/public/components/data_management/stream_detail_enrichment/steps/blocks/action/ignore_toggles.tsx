/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useWatch } from 'react-hook-form';
import { EuiCode, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ToggleField } from './toggle_field';

export const IgnoreFailureToggle = () => {
  const value = useWatch({ name: 'ignore_failure' });

  return (
    <ToggleField
      name="ignore_failure"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.ignoreFailuresLabel',
        { defaultMessage: 'Ignore failures for this processor' }
      )}
      helpText={
        !value ? (
          <EuiText component="span" size="relative" color="warning">
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.ignoreFailuresWarning"
              defaultMessage="Disabling the {ignoreField} option could lead to unexpected pipeline failures."
              values={{
                ignoreField: <EuiCode>ignore_failure</EuiCode>,
              }}
            />
          </EuiText>
        ) : undefined
      }
    />
  );
};

export const IgnoreMissingToggle = () => {
  return (
    <ToggleField
      name="ignore_missing"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.ignoreMissingLabel',
        { defaultMessage: 'Ignore missing' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.ignoreMissingHelpText',
        { defaultMessage: 'Ignore documents with a missing field.' }
      )}
    />
  );
};
