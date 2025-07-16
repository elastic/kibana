/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentPackEntry, ContentPackManifest, PARENT_STREAM_ID } from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { ContentPackObjectsList } from './objects_list';
import { importContent, previewContent } from './requests';
import { ContentPackMetadata } from './metadata';

export function ImportFlyout({
  onClose,
  definition,
  onImport,
}: {
  onClose: () => void;
  definition: Streams.WiredStream.GetResponse;
  onImport: () => void;
}) {
  const {
    core: { http, notifications },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackEntry[]>([]);
  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<{
    dashboards: string[];
    stream: string[];
  }>({ dashboards: [], stream: [] });
  const [manifest, setManifest] = useState<ContentPackManifest | undefined>();

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.importFlyout.title', {
              defaultMessage: 'Import content pack',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFilePicker
          id={'streams-content-import'}
          multiple={false}
          initialPromptText={i18n.translate('xpack.streams.importFlyout.selectFile', {
            defaultMessage: 'Select a streams content file',
          })}
          fullWidth
          onChange={async (files) => {
            if (files?.length) {
              const archiveFile = files.item(0);
              if (!archiveFile) return;

              setFile(archiveFile);
              setIsLoading(true);

              try {
                const contentPackParsed = await previewContent({
                  http,
                  definition,
                  file: archiveFile,
                });

                setManifest({
                  name: contentPackParsed.name,
                  version: contentPackParsed.version,
                  description: contentPackParsed.description,
                });

                const streamEntries = contentPackParsed.entries.filter(
                  (entry: ContentPackEntry) =>
                    entry.type === 'stream' && entry.stream?.name !== PARENT_STREAM_ID
                );

                setContentPackObjects(streamEntries);
              } catch (err) {
                setFile(null);
                notifications.toasts.addError(err, {
                  title: i18n.translate('xpack.streams.failedToPreviewContentError', {
                    defaultMessage: 'Failed to preview content pack',
                  }),
                  toastMessage: getFormattedError(err).message,
                });
              } finally {
                setIsLoading(false);
              }
            } else {
              setFile(null);
            }
          }}
          display={'large'}
        />

        {isLoading && (
          <>
            <EuiSpacer />
            <EuiText>
              <p>Loading content pack...</p>
            </EuiText>
          </>
        )}

        {file && manifest ? (
          <>
            <EuiSpacer />
            <ContentPackMetadata readonly manifest={manifest} />
            <EuiSpacer />

            {definition && contentPackObjects.length > 0 ? (
              <>
                <EuiText>
                  <h3>
                    {i18n.translate('xpack.streams.importFlyout.streamObjects', {
                      defaultMessage: 'Stream Objects',
                    })}
                  </h3>
                </EuiText>
                <EuiSpacer size="s" />
                <ContentPackObjectsList
                  definition={definition}
                  objects={contentPackObjects}
                  onSelectionChange={(objects) => {
                    setSelectedContentPackObjects(objects);
                  }}
                />
              </>
            ) : (
              <EuiText color="danger">
                <p>
                  {i18n.translate('xpack.streams.importFlyout.noStreamObjects', {
                    defaultMessage: 'No stream objects found in content pack',
                  })}
                </p>
              </EuiText>
            )}
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.streams.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppImportButton"
              disabled={!file || contentPackObjects.length === 0}
              isLoading={isLoading}
              fill
              onClick={async () => {
                if (!file) return;

                setIsLoading(true);

                try {
                  await importContent({
                    http,
                    file,
                    definition,
                    include: { objects: selectedContentPackObjects },
                  });

                  setIsLoading(false);
                  setContentPackObjects([]);
                  setFile(null);

                  notifications.toasts.addSuccess({
                    title: i18n.translate('xpack.streams.importSuccess', {
                      defaultMessage: 'Content pack imported successfully',
                    }),
                  });

                  onImport();
                } catch (err) {
                  notifications.toasts.addError(err, {
                    title: i18n.translate('xpack.streams.failedToImportContentError', {
                      defaultMessage: 'Failed to import content pack',
                    }),
                    toastMessage: getFormattedError(err).message,
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {i18n.translate('xpack.streams.importFlyout.importButton', {
                defaultMessage: 'Import to stream',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
