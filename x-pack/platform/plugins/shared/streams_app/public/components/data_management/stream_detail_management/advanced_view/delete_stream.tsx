/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../../hooks/use_kibana';
import { StreamDeleteModal } from '../../../stream_delete_modal';
import { Row } from './row';

export function DeleteStreamPanel({ definition }: { definition: Streams.all.GetResponse }) {
  const {
    core: {
      application: { navigateToApp },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const [showModal, setShowModal] = useState(false);

  const abortController = useAbortController();
  const deleteStream = useCallback(async () => {
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition, abortController.signal, navigateToApp, streamsRepositoryClient]);

  return (
    <>
      {showModal ? (
        <StreamDeleteModal
          name={definition.stream.name}
          onClose={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
          onDelete={deleteStream}
        />
      ) : null}

      <EuiPanel
        style={{ border: `1px solid ${euiTheme.colors.danger}` }}
        hasBorder={true}
        hasShadow={false}
        paddingSize="none"
        grow={false}
      >
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s" color="danger">
            <h3>
              {i18n.translate('xpack.streams.streamDeleteModal.title', {
                defaultMessage: 'Delete stream',
              })}
            </h3>
          </EuiText>
        </EuiPanel>

        <EuiPanel hasShadow={false} hasBorder={false}>
          <Row
            left={
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate('xpack.streams.streamDeleteModal.deleteStreamText', {
                      defaultMessage:
                        'Permanently delete your stream and all its contents from Elastic. This action is not reversible, so please proceed with caution.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            right={
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton color="danger" fill onClick={() => setShowModal((prev) => !prev)}>
                    {i18n.translate('xpack.streams.streamDeleteModal.deleteStreamButton', {
                      defaultMessage: 'Delete stream',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiPanel>
      </EuiPanel>
    </>
  );
}
