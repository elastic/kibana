/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { InferenceUsageInfo } from '../../../../types';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { RenderMessageWithIcon } from './render_message_with_icon';
import { ListUsageResults } from './list_usage_results';

interface ScanUsageResultsProps {
  list: InferenceUsageInfo[];
  ignoreWarningCheckbox: boolean;
  onIgnoreWarningCheckboxChange: (state: boolean) => void;
}

export const ScanUsageResults: React.FC<ScanUsageResultsProps> = ({
  list,
  ignoreWarningCheckbox,
  onIgnoreWarningCheckboxChange,
}) => {
  const {
    services: { share },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const handleNavigateToIndexManagement = async () => {
    const indexManagementLocator = share?.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    if (indexManagementLocator) {
      const url = await indexManagementLocator.getUrl({ page: 'index_list' });
      if (url) window.open(url, '_blank');
    }
  };

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <RenderMessageWithIcon
          icon="warning"
          color="danger"
          label={i18n.translate(
            'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.potentialFailure',
            { defaultMessage: 'Potential Failures' }
          )}
          labelColor="danger"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    css={css`
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                  >
                    <p>
                      {i18n.translate(
                        'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.countUsage',
                        {
                          defaultMessage:
                            'Found {count} {count, plural, =1 {usage} other {usages}}',
                          values: { count: list.length },
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleNavigateToIndexManagement}
                    iconType="external"
                    iconSide="right"
                    iconSize="s"
                    flush="both"
                    color="text"
                    aria-label={i18n.translate(
                      'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.openIndexManagement',
                      { defaultMessage: 'Open Index Management' }
                    )}
                    data-test-subj="inferenceManagementOpenIndexManagement"
                  >
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.openIndexManagement',
                        { defaultMessage: 'Open Index Management' }
                      )}
                    </EuiText>
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListUsageResults list={list} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiCheckbox
            data-test-subj="warningCheckbox"
            id={'ignoreWarningCheckbox'}
            label={i18n.translate(
              'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.ignoreErrors',
              { defaultMessage: 'Ignore errors and force deletion' }
            )}
            checked={ignoreWarningCheckbox}
            onChange={(e) => onIgnoreWarningCheckboxChange(e.target.checked)}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
