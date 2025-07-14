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
import {
  ContentPackEntry,
  ContentPackManifest,
  findConfiguration,
  isIndexPlaceholder,
} from '@kbn/content-packs-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { ContentPackObjectsList } from './content_pack_objects_list';
import { previewContent } from './content/requests';
import { ContentPackMetadata } from './content_pack_manifest';

export function ExportContentPackFlyout({
  definition,
  onExport,
  onClose,
}: {
  definition: Streams.ingest.all.GetResponse;
  onClose: () => void;
  onExport: () => void;
}) {
  const modalTitleId = useGeneratedHtmlId();

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
              replaced_patterns: [],
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

      const indexPatterns = uniq(
        contentPack.entries.flatMap((object) => findConfiguration(object).patterns)
      ).filter((index) => !isIndexPlaceholder(index));

      setManifest({
        name: contentPack.name,
        version: contentPack.version,
        description: contentPack.description,
      });

      return { contentPack, indexPatterns };
    },
    [definition, streamsRepositoryClient, http]
  );

  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackEntry[]>(
    []
  );
  const [replacedIndexPatterns, setReplacedIndexPatterns] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={modalTitleId}>
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
            {exportResponse.indexPatterns.length ? (
              <>
                <EuiCallOut>
                  <details>
                    <summary>
                      {i18n.translate('xpack.streams.exportContentFlyout.advancedSettings', {
                        defaultMessage: 'Advanced settings',
                      })}
                    </summary>
                    <EuiSpacer />
                    <p>
                      {i18n.translate('xpack.streams.exportContentFlyout.detectedIndexPatterns', {
                        defaultMessage:
                          'We detected index patterns that do not match {streamName}* in the content pack. Check the ones you want to replace with the target stream index on import.',
                        values: { streamName: definition.stream.name },
                      })}
                    </p>
                    {
                      <EuiCheckboxGroup
                        idToSelectedMap={replacedIndexPatterns}
                        onChange={(id) =>
                          setReplacedIndexPatterns({
                            ...replacedIndexPatterns,
                            ...{
                              [id]: !replacedIndexPatterns[id],
                            },
                          })
                        }
                        options={exportResponse.indexPatterns.map((index) => ({
                          id: index,
                          label: index,
                        }))}
                      />
                    }
                  </details>
                </EuiCallOut>

                <EuiSpacer />
              </>
            ) : null}

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
              isLoading={isExporting}
              isDisabled={
                isLoadingContentPack ||
                selectedContentPackObjects.length === 0 ||
                manifest?.name.length === 0
              }
              fill
              onClick={async () => {
                if (!exportResponse || !manifest || selectedContentPackObjects.length === 0) {
                  return;
                }

                setIsExporting(true);

                const replacedPatterns = Object.entries(replacedIndexPatterns)
                  .filter(([, selected]) => selected)
                  .map(([pattern]) => pattern);

                try {
                  const contentPack = await streamsRepositoryClient.fetch(
                    'POST /api/streams/{name}/content/export 2023-10-31',
                    {
                      params: {
                        path: { name: definition.stream.name },
                        body: {
                          ...manifest,
                          replaced_patterns: replacedPatterns,
                          include: {
                            objects: { dashboards: selectedContentPackObjects.map(({ id }) => id) },
                          },
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
                  setIsExporting(true);
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