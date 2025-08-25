/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
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

export const GroupStreamDetailView = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.GroupStream.GetResponse;
  refreshDefinition: () => void;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core,
  } = useKibana();
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

  function openGroupStreamModificationFlyout(existingStream?: Streams.GroupStream.Definition) {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <GroupStreamModificationFlyout
          client={streamsRepositoryClient}
          streamsList={streamsListFetch.value}
          refresh={() => {
            refreshDefinition();
            overlayRef.current?.close();
          }}
          notifications={core.notifications}
          existingStream={existingStream}
        />,
        core
      ),
      { size: 's' }
    );
  }

  function deleteGroupStream() {
    streamsRepositoryClient
      .fetch('DELETE /api/streams/{name} 2023-10-31', {
        params: { path: { name: definition.stream.name } },
        signal,
      })
      .then(() => {
        core.notifications.toasts.addSuccess(
          i18n.translate('xpack.streams.groupStreamDetailView.deleteSuccessToastMessage', {
            defaultMessage: '{name} was deleted',
            values: { name: definition.stream.name },
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
            values: { name: definition.stream.name },
          }),
        });
      })
      .finally(() => setShowDeleteModal(false));
  }

  const stream = definition.stream;

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
      description: stream.description,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.ownerLabel', {
        defaultMessage: 'Owner',
      }),
      description: stream.group.owner,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tierLabel', {
        defaultMessage: 'Tier',
      }),
      description: stream.group.tier,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      description:
        Object.keys(stream.group.metadata).length === 0 ? (
          i18n.translate('xpack.streams.groupStreamDetailView.noMetadataLabel', {
            defaultMessage: 'None',
          })
        ) : (
          <EuiCodeBlock>
            {Object.entries(stream.group.metadata)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}
          </EuiCodeBlock>
        ),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      description: stream.group.tags.length
        ? stream.group.tags.join(', ')
        : i18n.translate('xpack.streams.groupStreamDetailView.noneLabel', {
            defaultMessage: 'None',
          }),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.runbookLinksLabel', {
        defaultMessage: 'Runbook links',
      }),
      description: renderLinks(stream.group.runbook_links),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.documentationLinksLabel', {
        defaultMessage: 'Documentation links',
      }),
      description: renderLinks(stream.group.documentation_links),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.repositoryLinksLabel', {
        defaultMessage: 'Repository links',
      }),
      description: renderLinks(stream.group.repository_links),
    },
  ];

  return (
    <div>
      <EuiDescriptionList textStyle="reverse" listItems={meta} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              openGroupStreamModificationFlyout(stream);
            }}
          >
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
            values: { name: stream.name },
          })}
          title={i18n.translate('xpack.streams.groupStreamDetailView.deleteModalTitle', {
            defaultMessage: 'Delete {name}?',
            values: { name: stream.name },
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
