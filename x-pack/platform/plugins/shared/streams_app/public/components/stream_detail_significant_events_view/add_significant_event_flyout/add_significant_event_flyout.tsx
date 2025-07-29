/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import { FlowSelector } from './flow_selector';
import type { Flow } from './types';

interface Props {
  onClose?: () => void;
  definition: Streams.all.Definition;
}

export function AddSignificantEventFlyout(props: Props) {
  const [selectedFlow, setSelectedFlow] = React.useState<Flow>();

  return (
    <EuiFlyout
      aria-labelledby="addSignificantEventFlyout"
      onClose={() => props.onClose?.()}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailView.addSignificantEventFlyout', {
              defaultMessage: 'Add significant events',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FlowSelector selected={selectedFlow} onSelect={(flow) => setSelectedFlow(flow)} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiButton
            color="text"
            onClick={() => {
              props.onClose?.();
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.addSignificantEventFlyout.cancelButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
