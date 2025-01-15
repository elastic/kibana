/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiCard, EuiStat, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { reactRouterNavigate } from '../../../../../shared_imports';
import { DeprecationSource } from '../../../../../../common/types';
import { getDeprecationsUpperLimit } from '../../../../lib/utils';
import { LoadingIssuesError } from './loading_issues_error';
import { NoDeprecationIssues } from './no_deprecation_issues';

import './_deprecation_issues_panel.scss';

const i18nTexts = {
  warningDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.deprecationStats.warningDeprecationsTitle',
    {
      defaultMessage: 'Warning',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.deprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
};

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
      className="upgDeprecationIssuesPanel"
      layout="horizontal"
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
          <EuiFlexItem>
            <EuiStat
              data-test-subj="criticalDeprecations"
              className="upgDeprecationIssuesPanel__stat"
              title={
                hasError ? (
                  '--'
                ) : hasCriticalIssues ? (
                  getDeprecationsUpperLimit(criticalDeprecationsCount)
                ) : (
                  <NoDeprecationIssues
                    isPartial={true}
                    data-test-subj="noCriticalDeprecationIssues"
                  />
                )
              }
              titleElement="span"
              description={i18nTexts.criticalDeprecationsTitle}
              titleColor="danger"
              isLoading={isLoading}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiStat
              data-test-subj="warningDeprecations"
              className="upgDeprecationIssuesPanel__stat"
              title={
                hasError ? (
                  '--'
                ) : hasWarningIssues ? (
                  getDeprecationsUpperLimit(warningDeprecationsCount)
                ) : (
                  <NoDeprecationIssues
                    isPartial={true}
                    data-test-subj="noWarningDeprecationIssues"
                  />
                )
              }
              titleElement="span"
              description={i18nTexts.warningDeprecationsTitle}
              isLoading={isLoading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiCard>
  );
};
