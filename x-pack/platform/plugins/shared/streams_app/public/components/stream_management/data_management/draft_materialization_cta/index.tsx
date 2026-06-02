/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';

export function DraftMaterializationCTA({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core: { notifications },
  } = useKibana();

  const materialize = async () => {
    setIsMaterializing(true);
    try {
      const { updated_at: _, ...processing } = definition.stream.ingest.processing;
      await streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
        signal: null,
        params: {
          path: { name: definition.stream.name },
          body: {
            ...emptyAssets,
            stream: {
              type: definition.stream.type,
              description: definition.stream.description,
              ingest: {
                ...definition.stream.ingest,
                processing,
                wired: { ...definition.stream.ingest.wired, draft: false },
              },
            },
          },
        },
      });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.streams.draftMaterialization.success', {
          defaultMessage: 'Stream has been converted to ingest-time.',
        })
      );
      refreshDefinition();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.draftMaterialization.error', {
          defaultMessage: 'Failed to convert stream',
        }),
      });
    } finally {
      setIsMaterializing(false);
      setIsModalVisible(false);
    }
  };

  return (
    <>
      <EuiPanel hasBorder grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.draftMaterialization.panelTitle', {
              defaultMessage: 'Stream configuration',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xl">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.streams.draftMaterialization.title', {
                  defaultMessage: 'Convert this draft to ingest-time for a faster search',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.draftMaterialization.description', {
                defaultMessage:
                  'In Draft mode, processing happens at query time, without modifying your original data. If you want your data to be stored and optimized for fast search, convert this draft to ingest-time.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => setIsModalVisible(true)}
              disabled={!definition.privileges.manage}
            >
              {i18n.translate('xpack.streams.draftMaterialization.convertButton', {
                defaultMessage: 'Convert to ingest-time',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {isModalVisible && (
        <EuiConfirmModal
          title={i18n.translate('xpack.streams.draftMaterialization.modal.title', {
            defaultMessage: 'Convert draft stream to ingest-time?',
          })}
          onCancel={() => setIsModalVisible(false)}
          onConfirm={materialize}
          cancelButtonText={i18n.translate('xpack.streams.draftMaterialization.modal.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.streams.draftMaterialization.modal.confirm', {
            defaultMessage: 'Convert to ingest-time',
          })}
          isLoading={isMaterializing}
        >
          <p>
            {i18n.translate('xpack.streams.draftMaterialization.modal.description', {
              defaultMessage:
                'The stream will receive incoming data permanently, data will be stored according to your preferences, and optimized for fast search. This cannot be reverted.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
