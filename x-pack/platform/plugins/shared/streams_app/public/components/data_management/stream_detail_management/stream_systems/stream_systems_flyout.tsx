/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { System } from '@kbn/streams-schema';
import { StreamSystemsTable } from './stream_systems_table';

export const StreamSystemsFlyout = ({
  systems,
  closeFlyout,
}: {
  systems: System[];
  closeFlyout: () => void;
}) => {
  return (
    <EuiFlyout ownFocus onClose={closeFlyout} hideCloseButton aria-label={'Stream description'}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Stream description</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            Stream description is used to provide context to Elastic, so we could analyse, generate
            and work better with your data. We use this information to provide significant events
            and other insights.
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <StreamSystemsTable systems={systems} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeFlyout} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
