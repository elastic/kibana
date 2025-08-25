/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import {
  ConflictResolution,
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackManifest,
  StreamChanges,
  StreamConflicts,
} from '@kbn/content-packs-schema';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
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
import { previewContent, importContent, parseContent } from './requests';
import { ContentPackMetadata } from './manifest';
import { getFormattedError } from '../../../util/errors';
import { Diff } from './diff';

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
  const [manifest, setManifest] = useState<ContentPackManifest | undefined>();
  const [diffsAndConflicts, setDiffsAndConflicts] = useState<
    | {
        changes: StreamChanges[];
        conflicts: StreamConflicts[];
      }
    | undefined
  >();
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);

  return (
    <>
      {diffsAndConflicts ? (
        <EuiConfirmModal
          title="Preview"
          isLoading={isLoading}
          onCancel={() => setDiffsAndConflicts(undefined)}
          onConfirm={async () => {
            if (!file) return;

            setIsLoading(true);

            try {
              await importContent({
                http,
                file,
                definition,
                resolutions,
                include: includedObjects,
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
          cancelButtonText="Close"
          confirmButtonText="Import"
          buttonColor="primary"
          defaultFocusedButton="confirm"
        >
          <Diff resolutions={resolutions} setResolutions={setResolutions} {...diffsAndConflicts} />
        </EuiConfirmModal>
      ) : null}

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
                  const contentPack = await parseContent({
                    http,
                    definition,
                    file: archiveFile,
                  });

                  setManifest({
                    name: contentPack.name,
                    version: contentPack.version,
                    description: contentPack.description,
                  });
                  setContentPackObjects(contentPack.entries);
                } catch (err) {
                  setFile(null);

                  notifications.toasts.addError(err, {
                    title: i18n.translate('xpack.streams.failedToParseContentError', {
                      defaultMessage: 'Failed to parse content pack',
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
              <EuiButtonEmpty
                onClick={async () => {
                  if (!file) return;

                  const previewResponse = await previewContent({
                    http,
                    file,
                    definition,
                    include: includedObjects,
                  });
                  setDiffsAndConflicts(previewResponse);
                }}
              >
                {i18n.translate('xpack.streams.importContentPackFlyout.diffContent', {
                  defaultMessage: 'Preview',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
}
