/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import { VersionField } from '../../form';
import { useOsqueryVersionOptions } from '../queries/use_osquery_version_options';

const SINGLE_SELECTION = { asPlainText: true };

interface PackVersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const PackVersionFieldComponent = ({ euiFieldProps = {} }: PackVersionFieldProps) => {
  const { options, helpText } = useOsqueryVersionOptions();

  // Free-text entry is safe because VersionField validates the typed value
  // against the numeric osquery version regex before accepting it.
  const baseEuiFieldProps = useMemo(
    () => ({
      noSuggestions: false,
      singleSelection: SINGLE_SELECTION,
      placeholder: i18n.translate('xpack.osquery.pack.form.packVersionFieldPlaceholder', {
        defaultMessage: 'All',
      }),
      options,
      'data-test-subj': 'pack-version-field',
    }),
    [options]
  );

  const mergedEuiFieldProps = useMemo(
    () => ({ ...baseEuiFieldProps, ...euiFieldProps }),
    [baseEuiFieldProps, euiFieldProps]
  );

  return (
    <VersionField
      name="min_osquery_version"
      euiFieldProps={mergedEuiFieldProps}
      helpText={helpText}
    />
  );
};

export const PackVersionField = React.memo(PackVersionFieldComponent, deepEqual);
