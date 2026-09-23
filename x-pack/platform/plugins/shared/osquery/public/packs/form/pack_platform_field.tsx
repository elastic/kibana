/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import { PlatformCheckBoxGroupField } from '../queries/platform_checkbox_group_field';

interface PackPlatformFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const PACK_PLATFORM_LABEL_APPEND = (
  <EuiText size="xs" color="subdued">
    <FormattedMessage id="xpack.osquery.queryFlyoutForm.optionalLabel" defaultMessage="optional" />
  </EuiText>
);

const PACK_PLATFORM_PLACEHOLDER = i18n.translate(
  'xpack.osquery.pack.form.packPlatformFieldPlaceholder',
  { defaultMessage: 'All' }
);

/**
 * Pack-level operating-systems default.
 *
 * This is a *default that fans out onto inheriting queries*, not a pack gate:
 * Kibana never writes osquery's native `Pack.Platform` (an init-time gate that
 * would skip the entire pack). The value is expanded onto each query that does
 * not set its own `platform`, so a per-query value always wins and a mismatch
 * only ever skips that one query.
 *
 * Unlike the per-query {@link PlatformCheckBoxGroupField} this field is
 * optional — an empty value simply means "no pack default", leaving each query
 * to its own platform.
 */
const PackPlatformFieldComponent: React.FC<PackPlatformFieldProps> = ({ euiFieldProps = {} }) => {
  const mergedEuiFieldProps = useMemo(
    () => ({
      'data-test-subj': 'pack-platform-field',
      isClearable: true,
      placeholder: PACK_PLATFORM_PLACEHOLDER,
      ...euiFieldProps,
    }),
    [euiFieldProps]
  );

  return (
    <PlatformCheckBoxGroupField
      required={false}
      labelAppend={PACK_PLATFORM_LABEL_APPEND}
      euiFieldProps={mergedEuiFieldProps}
    />
  );
};

export const PackPlatformField = React.memo(PackPlatformFieldComponent, deepEqual);
