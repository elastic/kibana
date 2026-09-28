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
import { ALL_OSQUERY_VERSIONS_OPTIONS } from '../queries/constants';

const SINGLE_SELECTION = { asPlainText: true };

const PACK_VERSION_EUI_PROPS = {
  noSuggestions: false,
  singleSelection: SINGLE_SELECTION,
  placeholder: i18n.translate('xpack.osquery.pack.form.packVersionFieldPlaceholder', {
    defaultMessage: 'All',
  }),
  options: ALL_OSQUERY_VERSIONS_OPTIONS,
  // No free-text entry, matching the per-query version field (which the
  // query flyout deliberately passes `onCreateOption: undefined` for).
  // The API schema is a bare string with no semver validation, so an
  // arbitrary value like `latest` would persist here and then fan out
  // onto every inheriting query's `version` on the Fleet wire, where
  // osquery's version comparison cannot interpret it.
  onCreateOption: undefined,
  'data-test-subj': 'pack-version-field',
};

interface PackVersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const PackVersionFieldComponent = ({ euiFieldProps = {} }: PackVersionFieldProps) => {
  const mergedEuiFieldProps = useMemo(
    () => ({ ...PACK_VERSION_EUI_PROPS, ...euiFieldProps }),
    [euiFieldProps]
  );

  return <VersionField name="min_osquery_version" euiFieldProps={mergedEuiFieldProps} />;
};

export const PackVersionField = React.memo(PackVersionFieldComponent, deepEqual);
