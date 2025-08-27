/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { GroupStreamModificationFlyout } from '../../group_stream_modification_flyout/group_stream_modification_flyout';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';

export const GroupStreamDetailView = ({
  stream,
  refreshDefinition,
}: {
  stream: Streams.GroupStream.GetResponse;
  refreshDefinition: () => void;
}) => {
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core,
  } = context;
  const router = useStreamsAppRouter();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  const overlayRef = React.useRef<OverlayRef | null>(null);
  const { signal } = useAbortController();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function openGroupStreamModificationFlyout() {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <GroupStreamModificationFlyout
            client={streamsRepositoryClient}
            streamsList={streamsListFetch.value}
            refresh={() => {
              refreshDefinition();
              overlayRef.current?.close();
            }}
            notifications={core.notifications}
            existingStream={stream.stream}
            existingDashboards={stream.dashboards}
          />
        </StreamsAppContextProvider>,
        core
      ),
      { size: 's' }
    );
  }

  function deleteGroupStream() {
    streamsRepositoryClient
      .fetch('DELETE /api/streams/{name} 2023-10-31', {
        params: { path: { name: stream.stream.name } },
        signal,
      })
      .then(() => {
        core.notifications.toasts.addSuccess(
          i18n.translate('xpack.streams.groupStreamDetailView.deleteSuccessToastMessage', {
            defaultMessage: '{name} was deleted',
            values: { name: stream.stream.name },
          })
        );
        router.push('/', {
          path: {},
          query: {},
        });
      })
      .catch((error) => {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.groupStreamDetailView.deleteErrorToastMessage', {
            defaultMessage: 'Failed to delete {name}',
            values: { name: stream.stream.name },
          }),
        });
      })
      .finally(() => setShowDeleteModal(false));
  }

  const renderLinks = (links: string[]) =>
    links.length
      ? links
          .map((link, idx) => (
            <EuiLink key={idx} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </EuiLink>
          ))
          .reduce((prev, curr) => (
            <>
              {prev}, {curr}
            </>
          ))
      : i18n.translate('xpack.streams.groupStreamDetailView.noneLabel', {
          defaultMessage: 'None',
        });

  const meta = [
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.descriptionLabel', {
        defaultMessage: 'Description',
      }),
      description: stream.stream.description,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.ownerLabel', {
        defaultMessage: 'Owner',
      }),
      description: stream.stream.group.owner,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tierLabel', {
        defaultMessage: 'Tier',
      }),
      description: stream.stream.group.tier,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      description:
        Object.keys(stream.stream.group.metadata).length === 0 ? (
          i18n.translate('xpack.streams.groupStreamDetailView.noMetadataLabel', {
            defaultMessage: 'None',
          })
        ) : (
          <EuiCodeBlock>
            {Object.entries(stream.stream.group.metadata)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}
          </EuiCodeBlock>
        ),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      description: stream.stream.group.tags.length ? (
        <EuiFlexGroup gutterSize="xs" wrap>
          {stream.stream.group.tags.map((tag, index) => (
            <EuiFlexItem key={index} grow={false}>
              <EuiBadge>{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        i18n.translate('xpack.streams.groupStreamDetailView.noneLabel', {
          defaultMessage: 'None',
        })
      ),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.runbookLinksLabel', {
        defaultMessage: 'Runbook links',
      }),
      description: renderLinks(stream.stream.group.runbook_links),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.documentationLinksLabel', {
        defaultMessage: 'Documentation links',
      }),
      description: renderLinks(stream.stream.group.documentation_links),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.repositoryLinksLabel', {
        defaultMessage: 'Repository links',
      }),
      description: renderLinks(stream.stream.group.repository_links),
    },
  ];

  return (
    <div>
      <EuiDescriptionList textStyle="reverse" listItems={meta} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => openGroupStreamModificationFlyout()}>
            {i18n.translate('xpack.streams.groupStreamDetailView.editButtonLabel', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="danger" onClick={() => setShowDeleteModal(true)}>
            {i18n.translate('xpack.streams.groupStreamDetailView.deleteButtonLabel', {
              defaultMessage: 'Delete',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showDeleteModal && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.streams.groupStreamDetailView.deleteModalAriaLabel', {
            defaultMessage: 'Delete {name}?',
            values: { name: stream.stream.name },
          })}
          title={i18n.translate('xpack.streams.groupStreamDetailView.deleteModalTitle', {
            defaultMessage: 'Delete {name}?',
            values: { name: stream.stream.name },
          })}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={deleteGroupStream}
          cancelButtonText={i18n.translate(
            'xpack.streams.groupStreamDetailView.deleteModalCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.groupStreamDetailView.deleteModalConfirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        />
      )}
    </div>
  );
};
