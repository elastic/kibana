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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DetectedSystemEvents } from './detected_system_events';

export const StreamSystemDetailsFlyout = ({
  system,
  closeFlyout,
}: {
  system: System;
  closeFlyout: () => void;
}) => {
  const addToStream = () => {};
  const [value, setValue] = React.useState(system.description);
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.systemDetails.flyoutAriaLabel', {
        defaultMessage: 'System details',
      })}
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{system.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.description', {
                defaultMessage: 'Description',
              })}
            </h3>
          </EuiTitle>
          <EuiMarkdownEditor
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.systemDetailExpanded.markdownEditorAriaLabel',
              {
                defaultMessage: 'System description markdown editor',
              }
            )}
            value={value}
            onChange={setValue}
            height={400}
            readOnly={isEditing}
            initialViewMode="viewing"
          />
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.filter', {
                defaultMessage: 'Filter',
              })}
            </h3>
          </EuiTitle>
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m" lineNumbers>
            {JSON.stringify(system.filter)}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <DetectedSystemEvents system={system} />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('xpack.streams.systemDetails.closeButtonAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
            >
              <FormattedMessage
                id="xpack.streams.systemDetails.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={addToStream} fill>
              <FormattedMessage
                id="xpack.streams.systemDetails.saveChanges"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
