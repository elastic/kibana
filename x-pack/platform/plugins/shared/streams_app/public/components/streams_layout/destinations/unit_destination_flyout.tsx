/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DeleteDestinationConfirmation } from './delete_destination_confirmation';
import { DestinationIndicesList } from './destination_indices_list';
import type { DestinationViewModel } from './types';

const DestinationDeleteFooter = ({
  destinationName,
  onDelete,
  isDisabled = false,
}: {
  destinationName: string;
  onDelete: () => void;
  isDisabled?: boolean;
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <EuiButton
        color="danger"
        isDisabled={isDisabled}
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

export const UnitDestinationFlyout = ({
  destination,
  onClose,
  onDelete,
  onIndexClick,
  isDeleteDisabled = false,
}: {
  destination: DestinationViewModel;
  onClose: () => void;
  onDelete: () => void;
  onIndexClick: (indexName: string) => void;
  isDeleteDisabled?: boolean;
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsUnitDestinationFlyoutTitle' });

  return (
    <EuiFlyout
      ownFocus
      aria-labelledby={flyoutTitleId}
      onClose={onClose}
      size="m"
      data-test-subj="streamsUnitDestinationFlyout"
    >
      <EuiFlyoutBody>
        <DestinationIndicesList
          destination={destination}
          enabled={true}
          showHeader={true}
          titleId={flyoutTitleId}
          onIndexClick={onIndexClick}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <DestinationDeleteFooter
          destinationName={destination.name}
          isDisabled={isDeleteDisabled}
          onDelete={onDelete}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
