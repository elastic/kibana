/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RegionOption } from '../../types';

interface RegionOptionsProps {
  options: RegionOption[];
}

export const RegionOptions = ({ options }: RegionOptionsProps) => {
  const titleId = useGeneratedHtmlId();
  if (options.length === 0) return null;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xxs">
        <h3 id={titleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.regionOptionsTitle', {
            defaultMessage: 'Region options',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate(
            'xpack.searchInferenceEndpoints.modelDetailFlyout.regionOptionsDescription',
            {
              defaultMessage:
                'Inference traffic can be restricted to the following regions or geographies.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBadgeGroup aria-labelledby={titleId} data-test-subj="flyoutRegionOptions">
        {options.map(({ key, label }) => (
          <EuiBadge key={key} data-test-subj={`flyoutRegionOption-${key}`}>
            {label}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    </>
  );
};
