/*
 * Export flyout extracted from wrapper.tsx
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentPackManifest, ContentPackStream } from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { ContentPackObjectsList } from './objects_list';
import { previewContent } from './requests';
import { ContentPackMetadata } from './metadata';

export function ExportFlyout({
  onClose,
  definition,
}: {
  onClose: () => void;
  definition: Streams.WiredStream.GetResponse;
}) {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [isExporting, setIsExporting] = useState(false);
  const [manifest, setManifest] = useState<ContentPackManifest | undefined>();

  const { value: previewResponse, loading: isLoadingPreview } = useStreamsAppFetch(
    async ({ signal }) => {
      try {
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

        const file = new File([contentPackRaw], `${definition.stream.name}-1.0.0.zip`, {
          type: 'application/zip',
        });

        const contentPack = await previewContent({ http, file, definition });
        setManifest(contentPack);
        return contentPack;
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.previewContentPackError', {
            defaultMessage: 'Failed to preview content pack',
          }),
        });
      }
    },
    [definition, streamsRepositoryClient, http]
  );

  const streamEntries = useMemo(() => {
    if (!previewResponse) {
      return [];
    }

    return previewResponse.entries.filter(
      (entry): entry is ContentPackStream => entry.type === 'stream'
    );
  }, [previewResponse]);

  const [, setSelectedContentPackObjects] = useState<{
    stream: string[];
  }>({ stream: [] });

  const handleExport = async () => {
    try {
      setIsExporting(true);

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
          signal: new AbortController().signal,
        }
      );

      // @ts-expect-error
      const saveAs = await import('@elastic/filesaver').then((module) => module.saveAs);
      saveAs(
        new Blob([contentPackRaw], { type: 'application/zip' }),
        `${definition.stream.name}-1.0.0.zip`
      );

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.exportSuccess', {
          defaultMessage: 'Stream {streamName} exported successfully',
          values: { streamName: definition.stream.name },
        }),
      });

      onClose();
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.streams.failedToExportStreamError', {
          defaultMessage: 'Failed to export stream',
        }),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.exportFlyout.title', {
              defaultMessage: 'Export stream configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoadingPreview ? (
          <EuiLoadingSpinner size="l" />
        ) : previewResponse ? (
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

            {streamEntries.length > 0 ? (
              <ContentPackObjectsList
                definition={definition}
                objects={streamEntries}
                onSelectionChange={setSelectedContentPackObjects}
              />
            ) : (
              <EuiText>
                <p>
                  {i18n.translate('xpack.streams.exportFlyout.noStreamsFound', {
                    defaultMessage: 'No streams found',
                  })}
                </p>
              </EuiText>
            )}
          </>
        ) : (
          <p>
            {i18n.translate('xpack.streams.exportFlyout.noPreview', {
              defaultMessage: 'No preview available.',
            })}
          </p>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.streams.exportFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleExport}
              isLoading={isExporting}
              data-test-subj="streamsAppExportConfirmButton"
            >
              {i18n.translate('xpack.streams.exportFlyout.exportButton', {
                defaultMessage: 'Export',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
