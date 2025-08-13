/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import {
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackManifest,
} from '@kbn/content-packs-schema';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { ContentPackObjectsList } from './objects_list';
import { importContent, previewContent } from './requests';
import { ContentPackMetadata } from './manifest';
import { getFormattedError } from '../../../util/errors';
import { hasSelectedObjects } from './helpers';
import { Suggestions } from './suggestions';

export function ImportContentPackFlyout({
  definition,
  onImport,
  onClose,
}: {
  definition: Streams.WiredStream.GetResponse;
  onClose: () => void;
  onImport: () => void;
}) {
  const {
    core: { http, notifications },
  } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackEntry[]>([]);
  const [includedObjects, setIncludedObjects] = useState<ContentPackIncludedObjects>({
    objects: { all: {} },
  });
  const [manifest, setManifest] = useState<ContentPackManifest | null>(null);

  const previewExportedFile = useCallback(
    async (exportedFile: File) => {
      setFile(exportedFile);

      try {
        const contentPackParsed = await previewContent({
          http,
          definition,
          file: exportedFile,
        });

        setManifest({
          name: contentPackParsed.name,
          version: contentPackParsed.version,
          description: contentPackParsed.description,
        });
        setContentPackObjects(contentPackParsed.entries);
      } catch (err) {
        setFile(null);

        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.streams.failedToPreviewContentError', {
            defaultMessage: 'Failed to preview content pack',
          }),
          toastMessage: getFormattedError(err).message,
        });
      }
    },
    [http, definition, notifications]
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.streamDetailDashboard.importContent', {
              defaultMessage: 'Import content pack',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {manifest ? null : (
          <>
            <EuiFilePicker
              id={'streams-content-import'}
              multiple={false}
              initialPromptText="Select a streams content file"
              fullWidth
              onChange={async (files) => {
                if (files?.length) {
                  const archiveFile = files.item(0);
                  if (!archiveFile) return;

                  previewExportedFile(archiveFile);
                } else {
                  setFile(null);
                }
              }}
              display={'large'}
            />

            <EuiSpacer />

            <Suggestions
              definition={definition}
              onPackageExport={(file) => {
                previewExportedFile(file);
              }}
            />
          </>
        )}

        {manifest ? (
          <>
            <ContentPackMetadata manifest={manifest} readonly={true} />
            <EuiSpacer />
            <ContentPackObjectsList
              definition={definition}
              objects={contentPackObjects}
              onSelectionChange={setIncludedObjects}
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()}>
              {i18n.translate('xpack.streams.importContentPackFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppModalFooterButton"
              isDisabled={!hasSelectedObjects(includedObjects)}
              isLoading={isLoading}
              fill
              onClick={async () => {
                if (!file || !manifest || !hasSelectedObjects(includedObjects)) return;

                setIsLoading(true);

                try {
                  await importContent({
                    http,
                    file,
                    definition,
                    include: includedObjects,
                  });

                  setIsLoading(false);
                  setContentPackObjects([]);
                  setFile(null);
                  setManifest(null);
                  onImport();
                } catch (err) {
                  setIsLoading(false);

                  notifications.toasts.addError(err, {
                    title: i18n.translate('xpack.streams.failedToImportContentError', {
                      defaultMessage: 'Failed to import content pack',
                    }),
                    toastMessage: getFormattedError(err).message,
                  });
                }
              }}
            >
              {i18n.translate('xpack.streams.importContentPackFlyout.importToStream', {
                defaultMessage: 'Import to stream',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
