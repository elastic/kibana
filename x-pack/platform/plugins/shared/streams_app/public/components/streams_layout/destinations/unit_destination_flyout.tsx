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
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DeleteDestinationConfirmation } from './delete_destination_confirmation';

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
  destinationName,
  onClose,
  onDelete,
  isDeleteDisabled = false,
}: {
  destinationName: string;
  onClose: () => void;
  onDelete: () => void;
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
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{destinationName}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText data-test-subj="streamsUnitDestinationFlyoutPlaceholder">
          <p>
            <FormattedMessage
              id="xpack.streams.destinations.flyout.provisioningPlaceholderDescription"
              defaultMessage="Placeholder until destination resources can be provisioned locally"
            />
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <DestinationDeleteFooter
          destinationName={destinationName}
          isDisabled={isDeleteDisabled}
          onDelete={onDelete}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
