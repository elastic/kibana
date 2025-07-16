/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import { ContentPackEntry, ContentPackManifest } from '@kbn/content-packs-schema';
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
import { ContentPackObjectsList } from './content_pack_objects_list';
import { importContent, previewContent } from './requests';
import { ContentPackMetadata } from './content_pack_manifest';
import { getFormattedError } from '../../../util/errors';

export function ImportContentPackFlyout({
  definition,
  onImport,
  onClose,
}: {
  definition: Streams.ingest.all.GetResponse;
  onClose: () => void;
  onImport: () => void;
}) {
  const {
    core: { http, notifications },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackEntry[]>([]);
  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackEntry[]>(
    []
  );
  const [manifest, setManifest] = useState<ContentPackManifest | undefined>();

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
        <EuiFilePicker
          id={'streams-content-import'}
          multiple={false}
          initialPromptText="Select a streams content file"
          fullWidth
          onChange={async (files) => {
            if (files?.length) {
              const archiveFile = files.item(0);
              if (!archiveFile) return;

              setFile(archiveFile);

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
            } else {
              setFile(null);
            }
          }}
          display={'large'}
        />

        {file && manifest ? (
          <>
            <EuiSpacer />
            <ContentPackMetadata manifest={manifest} readonly={true} />
            <EuiSpacer />

            <ContentPackObjectsList
              objects={contentPackObjects}
              onSelectionChange={(objects) => setSelectedContentPackObjects(objects)}
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
              disabled={!file}
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
                    include: { all: {} },
                  });

                  setIsLoading(false);
                  setContentPackObjects([]);
                  setFile(null);
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
