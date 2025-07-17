/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { Streams } from '@kbn/streams-schema';
import { ContentPackEntry, ContentPackManifest } from '@kbn/content-packs-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { ContentPackObjectsList } from './content_pack_objects_list';
import { previewContent } from './requests';
import { ContentPackMetadata } from './content_pack_manifest';
import { prepareIncludePayload } from './utils';

export function ExportContentPackFlyout({
  definition,
  onExport,
  onClose,
}: {
  definition: Streams.ingest.all.GetResponse;
  onClose: () => void;
  onExport: () => void;
}) {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [manifest, setManifest] = useState<ContentPackManifest | undefined>();

  const { value: exportResponse, loading: isLoadingContentPack } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition) {
        return;
      }

      const contentPackRaw = await streamsRepositoryClient.fetch(
        'POST /api/streams/{name}/content/export 2023-10-31',
        {
          params: {
            path: { name: definition.stream.name },
            body: {
              name: definition.stream.name,
              description: '',
              version: '1.0.0',
              include: { all: {} },
            },
          },
          signal,
        }
      );

      const contentPack = await previewContent({
        http,
        definition,
        file: new File([contentPackRaw], `${definition.stream.name}-1.0.0.zip`, {
          type: 'application/zip',
        }),
      });

      setManifest({
        name: contentPack.name,
        version: contentPack.version,
        description: contentPack.description,
      });

      return { contentPack };
    },
    [definition, streamsRepositoryClient, http]
  );

  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackEntry[]>(
    []
  );
  const [isExporting, setIsExporting] = useState(false);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.streamDetailDashboard.exportContent', {
              defaultMessage: 'Export content pack',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoadingContentPack ? (
          <EuiLoadingSpinner />
        ) : !exportResponse ? null : exportResponse.contentPack.entries ? (
          <>
            {manifest ? (
              <ContentPackMetadata
                manifest={manifest}
                onChange={(updatedManifest) => {
                  setManifest(updatedManifest);
                }}
              />
            ) : null}

            <EuiSpacer />

            <ContentPackObjectsList
              objects={exportResponse.contentPack.entries}
              onSelectionChange={setSelectedContentPackObjects}
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppModalFooterButton"
              isLoading={isExporting}
              isDisabled={isLoadingContentPack || manifest?.name.length === 0}
              fill
              onClick={async () => {
                if (!exportResponse || !manifest) {
                  return;
                }

                setIsExporting(true);

                try {
                  const contentPack = await streamsRepositoryClient.fetch(
                    'POST /api/streams/{name}/content/export 2023-10-31',
                    {
                      params: {
                        path: { name: definition.stream.name },
                        body: {
                          ...manifest,
                          include: prepareIncludePayload(
                            exportResponse.contentPack.entries,
                            selectedContentPackObjects
                          ),
                        },
                      },
                      signal: new AbortController().signal,
                    }
                  );

                  saveAs(
                    new Blob([contentPack], { type: 'application/zip' }),
                    `${manifest.name}-${manifest.version}.zip`
                  );
                  onExport();
                } catch (err) {
                  notifications.toasts.addError(err, {
                    title: i18n.translate('xpack.streams.failedToExportContentError', {
                      defaultMessage: 'Failed to export content pack',
                    }),
                  });
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {i18n.translate('xpack.streams.exportContentPackFlyout.exportContentPack', {
                defaultMessage: 'Export content pack',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
