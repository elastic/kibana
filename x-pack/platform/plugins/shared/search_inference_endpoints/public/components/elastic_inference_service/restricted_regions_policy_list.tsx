/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  type EuiSelectableOption,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const listCss = ({ euiTheme }: UseEuiTheme) => ({
  maxHeight: euiTheme.base * 20,
  overflowY: 'auto' as const,
});

export interface RestrictedRegionsPolicyListProps {
  options: EuiSelectableOption[];
  ariaLabel: string;
  'data-test-subj': string;
}

export const RestrictedRegionsPolicyList: React.FC<RestrictedRegionsPolicyListProps> = ({
  options,
  ariaLabel,
  'data-test-subj': testSubj,
}) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    css={listCss}
    role="group"
    aria-label={ariaLabel}
    data-test-subj={testSubj}
  >
    {options.map((option) => {
      const isIncluded = option.checked === 'on';

      return (
        <EuiFlexItem key={option.key ?? option.label} grow={false}>
          {option.isGroupLabel ? (
            <EuiText size="xs" data-test-subj={option['data-test-subj']}>
              <strong>{option.label}</strong>
            </EuiText>
          ) : (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj={option['data-test-subj']}
            >
              <EuiFlexItem
                grow={false}
                data-test-subj={
                  isIncluded ? 'restrictedRegionsIncludedIcon' : 'restrictedRegionsExcludedIcon'
                }
              >
                <EuiIcon
                  type={isIncluded ? 'checkCircleFill' : 'cross'}
                  color={isIncluded ? 'success' : 'text'}
                  aria-label={
                    isIncluded
                      ? i18n.translate(
                          'xpack.searchInferenceEndpoints.eisModelsPage.regionPolicyIncludedAriaLabel',
                          { defaultMessage: 'Included in region policy' }
                        )
                      : i18n.translate(
                          'xpack.searchInferenceEndpoints.eisModelsPage.regionPolicyExcludedAriaLabel',
                          { defaultMessage: 'Not included in region policy' }
                        )
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{option.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);
