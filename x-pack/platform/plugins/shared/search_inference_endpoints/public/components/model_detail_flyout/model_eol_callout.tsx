/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface ModelEolCalloutProps {
  eolDate: string;
}

export const ModelEolCallout = ({ eolDate }: ModelEolCalloutProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const showDetails = useCallback(() => {
    setIsDetailsOpen(true);
  }, []);

  const hideDetails = useCallback(() => {
    setIsDetailsOpen(false);
  }, []);

  return (
    <KbnDangerCallout
      size="m"
      announceOnMount={false}
      data-test-subj="modelDetailFlyoutEolCallout"
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.modelDetailFlyout.eolUnavailableTitle',
        { defaultMessage: 'Model not available for use' }
      )}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart" responsive={false}>
        {isDetailsOpen && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="modelDetailFlyoutEolDescription">
              <FormattedMessage
                id="xpack.searchInferenceEndpoints.modelDetailFlyout.reachedEndOfLifeDescription"
                defaultMessage="<bold>End-of-life ({eolDate}).</bold> This model is retired and its endpoints will fail. Migrate to a supported model."
                values={{
                  eolDate,
                  bold: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          {isDetailsOpen ? (
            <EuiButton
              size="s"
              color="danger"
              fill
              onClick={hideDetails}
              data-test-subj="modelDetailFlyoutEolHideDetailsButton"
            >
              {i18n.translate(
                'xpack.searchInferenceEndpoints.modelDetailFlyout.eolHideDetailsButtonLabel',
                { defaultMessage: 'Hide details' }
              )}
            </EuiButton>
          ) : (
            <EuiButton
              size="s"
              color="danger"
              fill
              onClick={showDetails}
              data-test-subj="modelDetailFlyoutEolViewDetailsButton"
            >
              {i18n.translate(
                'xpack.searchInferenceEndpoints.modelDetailFlyout.eolViewDetailsButtonLabel',
                { defaultMessage: 'View details' }
              )}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </KbnDangerCallout>
  );
};
