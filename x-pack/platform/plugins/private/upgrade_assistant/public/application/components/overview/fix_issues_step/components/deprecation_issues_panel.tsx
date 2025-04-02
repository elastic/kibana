/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiCard, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { reactRouterNavigate } from '../../../../../shared_imports';
import { DeprecationSource } from '../../../../../../common/types';
import { getDeprecationsUpperLimit } from '../../../../lib/utils';
import { LoadingIssuesError } from './loading_issues_error';
import { NoDeprecationIssues } from './no_deprecation_issues';
import { DeprecationIssue } from './deprecation_issues';

interface Props {
  'data-test-subj': string;
  deprecationSource: DeprecationSource;
  linkUrl: string;
  criticalDeprecationsCount: number;
  warningDeprecationsCount: number;
  isLoading: boolean;
  errorMessage?: JSX.Element | string | null;
  setIsFixed: (isFixed: boolean) => void;
}

export const DeprecationIssuesPanel = (props: Props) => {
  const {
    deprecationSource,
    linkUrl,
    criticalDeprecationsCount,
    warningDeprecationsCount,
    isLoading,
    errorMessage,
    setIsFixed,
  } = props;
  const history = useHistory();

  const hasError = !!errorMessage;
  const hasCriticalIssues = criticalDeprecationsCount > 0;
  const hasWarningIssues = warningDeprecationsCount > 0;
  const hasNoIssues = !isLoading && !hasError && !hasWarningIssues && !hasCriticalIssues;

  useEffect(() => {
    if (!isLoading && !errorMessage) {
      setIsFixed(criticalDeprecationsCount === 0);
    }
  }, [setIsFixed, criticalDeprecationsCount, isLoading, errorMessage]);

  return (
    <EuiCard
      data-test-subj={props['data-test-subj']}
      layout="horizontal"
      display="plain"
      hasBorder
      title={deprecationSource}
      titleSize="xs"
      {...(!hasNoIssues && reactRouterNavigate(history, linkUrl))}
    >
      <EuiSpacer size="s" />

      {hasError ? (
        <LoadingIssuesError>{errorMessage}</LoadingIssuesError>
      ) : hasNoIssues ? (
        <NoDeprecationIssues data-test-subj="noDeprecationIssues" />
      ) : (
        <EuiFlexGroup>
          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          )}
          {hasCriticalIssues && (
            <DeprecationIssue
              type="critical"
              color="danger"
              iconType="errorFilled"
              message={
                <FormattedMessage
                  id="xpack.upgradeAssistant.deprecationStats.criticalDeprecationsTitle"
                  defaultMessage="{errorCountValue} {criticalDeprecationsCount, plural, one {Error} other {Errors}}"
                  values={{
                    criticalDeprecationsCount,
                    errorCountValue: (
                      <strong>{getDeprecationsUpperLimit(criticalDeprecationsCount)}</strong>
                    ),
                  }}
                />
              }
            />
          )}
          {hasWarningIssues && (
            <DeprecationIssue
              type="warning"
              color="warning"
              iconType="warningFilled"
              message={
                <FormattedMessage
                  id="xpack.upgradeAssistant.deprecationStats.warningDeprecationsTitle"
                  defaultMessage="{warningCountValue} {warningDeprecationsCount, plural, one {Warning} other {Warnings}}"
                  values={{
                    warningDeprecationsCount,
                    warningCountValue: (
                      <strong>{getDeprecationsUpperLimit(warningDeprecationsCount)}</strong>
                    ),
                  }}
                />
              }
            />
          )}
        </EuiFlexGroup>
      )}
    </EuiCard>
  );
};
