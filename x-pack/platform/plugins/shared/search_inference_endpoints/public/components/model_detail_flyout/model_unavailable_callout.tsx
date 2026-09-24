/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface ModelUnavailableCalloutProps {
  onManageRegions?: () => void;
}

export const ModelUnavailableCallout = ({ onManageRegions }: ModelUnavailableCalloutProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const showDetails = useCallback(() => {
    setIsDetailsOpen(true);
  }, []);

  const hideDetails = useCallback(() => {
    setIsDetailsOpen(false);
  }, []);

  const detailsToggleButton = isDetailsOpen ? (
    <EuiButton
      size="s"
      color="warning"
      fill
      onClick={hideDetails}
      data-test-subj="modelDetailFlyoutHideDetailsButton"
    >
      {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.hideDetailsButtonLabel', {
        defaultMessage: 'Hide details',
      })}
    </EuiButton>
  ) : (
    <EuiButton
      size="s"
      color="warning"
      fill
      onClick={showDetails}
      data-test-subj="modelDetailFlyoutViewDetailsButton"
    >
      {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.viewDetailsButtonLabel', {
        defaultMessage: 'View details',
      })}
    </EuiButton>
  );

  const actions =
    isDetailsOpen && onManageRegions ? (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{detailsToggleButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="warning"
            fill={false}
            onClick={onManageRegions}
            data-test-subj="modelDetailFlyoutEditRegionPreferencesButton"
          >
            {i18n.translate(
              'xpack.searchInferenceEndpoints.modelDetailFlyout.editRegionPreferencesButtonLabel',
              { defaultMessage: 'Edit Region preferences' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      detailsToggleButton
    );

  return (
    <KbnWarningCallout
      size="m"
      announceOnMount={false}
      data-test-subj="modelDetailFlyoutRegionUnavailableCallout"
      title={i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.unavailableTitle', {
        defaultMessage: 'Model not available for use',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart" responsive={false}>
        {isDetailsOpen && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="modelDetailFlyoutRegionUnavailableDescription">
              <FormattedMessage
                id="xpack.searchInferenceEndpoints.modelDetailFlyout.blockedByRegionPolicyDescription"
                defaultMessage="<bold>Blocked by your region policy.</bold> This model is not available in your allowed regions."
                values={{
                  bold: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>{actions}</EuiFlexItem>
      </EuiFlexGroup>
    </KbnWarningCallout>
  );
};
