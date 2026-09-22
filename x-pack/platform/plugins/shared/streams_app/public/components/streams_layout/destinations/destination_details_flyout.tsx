/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DESTINATION_INDEX_LABEL,
  DESTINATION_INDEX_PATTERNS_LABEL,
  LOCAL_ELASTICSEARCH_LABEL,
} from './destination_type_config';
import { DeleteDestinationConfirmation } from './delete_destination_confirmation';
import type { DestinationsController } from './destinations_context';
import type { DestinationViewModel } from './types';

interface DestinationDetailsFlyoutProps {
  destinations: Pick<DestinationsController, 'deleteDestination'>;
  destination: DestinationViewModel;
  onClose: () => void;
}

export const DestinationDeleteFooter = ({
  destinationName,
  onDelete,
}: {
  destinationName: string;
  onDelete: () => void;
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <EuiButton
        color="danger"
        onClick={() => setIsConfirmingDelete(true)}
        data-test-subj="streamsDeleteDestinationButton"
      >
        <FormattedMessage
          id="xpack.streams.destinations.deleteDestinationButtonLabel"
          defaultMessage="Delete destination"
        />
      </EuiButton>
      {isConfirmingDelete && (
        <DeleteDestinationConfirmation
          destinationName={destinationName}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() => {
            onDelete();
            setIsConfirmingDelete(false);
          }}
        />
      )}
    </>
  );
};

export const DestinationDetailsFlyout = ({
  destinations,
  destination,
  onClose,
}: DestinationDetailsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsDestinationDetailsTitle' });

  return (
    <>
      <EuiFlyout
        ownFocus
        aria-labelledby={flyoutTitleId}
        onClose={onClose}
        size="s"
        data-test-subj="streamsDestinationDetailsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{destination.name}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {LOCAL_ELASTICSEARCH_LABEL}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiDescriptionList
            type="column"
            listItems={[
              {
                title: DESTINATION_INDEX_LABEL,
                description: destination.index,
              },
              {
                title: DESTINATION_INDEX_PATTERNS_LABEL,
                description: i18n.formatList('conjunction', destination.indexPatterns),
              },
            ]}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <DestinationDeleteFooter
            destinationName={destination.name}
            onDelete={() => destinations.deleteDestination(destination.id)}
          />
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
