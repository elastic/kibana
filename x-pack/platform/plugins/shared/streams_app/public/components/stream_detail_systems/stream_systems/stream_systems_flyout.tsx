/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamSystemsApi } from '../../../hooks/use_stream_systems_api';
import { StreamSystemsTable } from './stream_systems_table';

export const StreamSystemsFlyout = ({
  definition,
  systems,
  setSystems,
  closeFlyout,
  onSystemsAdded,
  onSystemsDiscarded,
}: {
  definition: Streams.all.Definition;
  systems: System[];
  setSystems: React.Dispatch<React.SetStateAction<System[]>>;
  closeFlyout: () => void;
  onSystemsAdded: () => void;
  onSystemsDiscarded: () => void;
}) => {
  const {
    core: { notifications },
  } = useKibana();

  const [selectedSystemNames, setSelectedSystemNames] = useState<Set<string>>(new Set());
  const { addSystemsToStream } = useStreamSystemsApi(definition);
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedSystems = useMemo(
    () => systems.filter((s) => selectedSystemNames.has(s.name)),
    [systems, selectedSystemNames]
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.streamSystemsFlyout.flyoutAriaLabel', {
        defaultMessage: 'Stream description',
      })}
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.streams.streamSystemsFlyout.title"
              defaultMessage="System identification"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          & .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      >
        <StreamSystemsTable
          systems={systems}
          selectedSystemNames={selectedSystemNames}
          setSelectedSystemNames={setSelectedSystemNames}
          definition={definition}
          setSystems={setSystems}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isDisabled={isUpdating}
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('xpack.streams.streamSystemsFlyout.closeButtonAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
              data-test-subj="system_identification_close_flyout_button"
            >
              <FormattedMessage
                id="xpack.streams.streamSystemsFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonEmpty
                  onClick={() => {
                    onSystemsDiscarded();
                  }}
                >
                  <FormattedMessage
                    id="xpack.streams.streamSystemsFlyout.discardButton"
                    defaultMessage="Discard"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  isLoading={isUpdating}
                  onClick={() => {
                    setIsUpdating(true);
                    addSystemsToStream(selectedSystems).finally(() => {
                      notifications.toasts.addSuccess({
                        title: i18n.translate(
                          'xpack.streams.streamSystemsFlyout.addSystemsSuccessToastTitle',
                          {
                            defaultMessage:
                              '{count} {count, plural, one {system} other {systems}} added to stream',
                            values: { count: selectedSystems.length },
                          }
                        ),
                      });
                      onSystemsAdded();
                      setIsUpdating(false);
                    });
                  }}
                  fill
                  isDisabled={selectedSystemNames.size === 0}
                >
                  <FormattedMessage
                    id="xpack.streams.streamSystemsFlyout.addToStreamButton"
                    defaultMessage="Add to stream"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
