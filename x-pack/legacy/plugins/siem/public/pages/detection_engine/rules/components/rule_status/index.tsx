/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { useRuleStatus, RuleInfoStatus } from '../../../../../containers/detection_engine/rules';
import { FormattedDate } from '../../../../../components/formatted_date';
import { getEmptyTagValue } from '../../../../../components/empty_value';
import { getStatusColor } from './helpers';
import * as i18n from './translations';

interface RuleStatusProps {
  ruleId: string | null;
  ruleEnabled?: boolean | null;
}

const RuleStatusComponent: React.FC<RuleStatusProps> = ({ ruleId, ruleEnabled }) => {
  const [loading, ruleStatus, fetchRuleStatus] = useRuleStatus(ruleId);
  const [myRuleEnabled, setMyRuleEnabled] = useState<boolean | null>(ruleEnabled ?? null);
  const [currentStatus, setCurrentStatus] = useState<RuleInfoStatus | null>(
    ruleStatus?.current_status ?? null
  );

  useEffect(() => {
    if (myRuleEnabled !== ruleEnabled && fetchRuleStatus != null && ruleId != null) {
      fetchRuleStatus(ruleId);
      if (myRuleEnabled !== ruleEnabled) {
        setMyRuleEnabled(ruleEnabled ?? null);
      }
    }
  }, [fetchRuleStatus, myRuleEnabled, ruleId, ruleEnabled, setMyRuleEnabled]);

  useEffect(() => {
    if (!isEqual(currentStatus, ruleStatus?.current_status)) {
      setCurrentStatus(ruleStatus?.current_status ?? null);
    }
  }, [currentStatus, ruleStatus, setCurrentStatus]);

  const handleRefresh = useCallback(() => {
    if (fetchRuleStatus != null && ruleId != null) {
      fetchRuleStatus(ruleId);
    }
  }, [fetchRuleStatus, ruleId]);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        {i18n.STATUS}
        {':'}
      </EuiFlexItem>
      {loading && (
        <EuiFlexItem>
          <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
        </EuiFlexItem>
      )}
      {!loading && (
        <>
          <EuiFlexItem grow={false}>
            <EuiHealth color={getStatusColor(currentStatus?.status ?? null)}>
              <EuiText size="xs">{currentStatus?.status ?? getEmptyTagValue()}</EuiText>
            </EuiHealth>
          </EuiFlexItem>
          {currentStatus?.status_date != null && currentStatus?.status != null && (
            <>
              <EuiFlexItem grow={false}>
                <>{i18n.STATUS_AT}</>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <FormattedDate value={currentStatus?.status_date} fieldName={i18n.STATUS_DATE} />
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="primary"
              onClick={handleRefresh}
              iconType="refresh"
              aria-label={i18n.REFRESH}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

export const RuleStatus = memo(RuleStatusComponent);
