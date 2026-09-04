/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MissingDashboard } from './search_related_dashboards';

export const MissingDashboardsCallout = ({
  missing,
  onRemove,
}: {
  missing: MissingDashboard[];
  onRemove: (dashboardId: string) => void;
}) => (
  <>
    <EuiSpacer size="s" />
    <EuiCallOut
      color="warning"
      size="s"
      iconType="warning"
      data-test-subj="missingDashboardsCallout"
      title={i18n.translate('xpack.alertingV2.ruleForm.missingDashboardsCalloutTitle', {
        defaultMessage:
          '{count, plural, one {# linked dashboard is} other {# linked dashboards are}} unavailable',
        values: { count: missing.length },
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.alertingV2.ruleForm.missingDashboardsCalloutBody"
          defaultMessage="These dashboards may have been deleted or are no longer accessible. Remove them to save a clean rule."
        />
      </p>
      <EuiFlexGroup direction="column" gutterSize="xs">
        {missing.map((missingDashboard) => (
          <EuiFlexItem key={missingDashboard.id} grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj={`missingDashboardArtifact-${missingDashboard.id}`}
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType="warning">
                  {missingDashboard.notFound
                    ? i18n.translate('xpack.alertingV2.ruleForm.missingDashboardDeletedBadge', {
                        defaultMessage: 'Dashboard deleted',
                      })
                    : i18n.translate('xpack.alertingV2.ruleForm.missingDashboardUnavailableBadge', {
                        defaultMessage: 'Dashboard unavailable',
                      })}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.alertingV2.ruleForm.missingDashboardUnknownLabel"
                    defaultMessage="Unknown dashboard"
                  />{' '}
                  <EuiCode>{missingDashboard.id}</EuiCode>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.alertingV2.ruleForm.removeMissingDashboardAriaLabel',
                    {
                      defaultMessage: 'Remove unavailable dashboard {dashboardId}',
                      values: { dashboardId: missingDashboard.id },
                    }
                  )}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    data-test-subj={`removeMissingDashboardButton-${missingDashboard.id}`}
                    aria-label={i18n.translate(
                      'xpack.alertingV2.ruleForm.removeMissingDashboardAriaLabel',
                      {
                        defaultMessage: 'Remove unavailable dashboard {dashboardId}',
                        values: { dashboardId: missingDashboard.id },
                      }
                    )}
                    onClick={() => onRemove(missingDashboard.id)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiCallOut>
  </>
);
