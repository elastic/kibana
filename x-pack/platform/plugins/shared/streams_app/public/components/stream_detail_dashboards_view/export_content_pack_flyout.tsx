/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { capitalize, uniq } from 'lodash';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import {
  ContentPackObject,
  ContentPackSavedObject,
  INDEX_PLACEHOLDER,
  IngestStreamGetResponse,
  findIndexPatterns,
  isIndexPlaceholder,
  replaceIndexPatterns,
} from '@kbn/streams-schema';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCheckboxGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

export function ExportContentPackFlyout({
  definition,
  onExport,
  onClose,
}: {
  definition: IngestStreamGetResponse;
  onClose: () => void;
  onExport: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value: exportResponse, loading: isLoadingContentPack } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition) {
        return;
      }

      const contentPack = await streamsRepositoryClient.fetch(
        'POST /api/streams/{name}/content/export 2023-10-31',
        {
          params: {
            path: { name: definition.stream.name },
          },
          signal,
        }
      );

      const isSavedObject = (object: ContentPackObject): object is ContentPackSavedObject =>
        object.type === 'saved_object';
      const objects = contentPack.content
        .split('\n')
        .map((object) => JSON.parse(object) as ContentPackObject);
      const indexPatterns = uniq(
        objects.filter(isSavedObject).flatMap((object) => findIndexPatterns(object))
      ).filter((index) => !isIndexPlaceholder(index));

      return { contentPack, objects, indexPatterns };
    },
    [definition, streamsRepositoryClient]
  );

  const [indexPatternReplacements, setIndexPatternReplacements] = useState<Record<string, boolean>>(
    {}
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
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
        ) : !exportResponse ? null : exportResponse.objects ? (
          <>
            <EuiSpacer />

            {exportResponse.indexPatterns.length ? (
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
                      idToSelectedMap={indexPatternReplacements}
                      onChange={(id) =>
                        setIndexPatternReplacements({
                          ...indexPatternReplacements,
                          ...{
                            [id]: !indexPatternReplacements[id],
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
            ) : null}

            <EuiSpacer />

            <EuiBasicTable
              items={exportResponse.objects.filter((object) => object.content.type === 'dashboard')}
              itemId={(record: ContentPackObject) => record.content.id}
              columns={[
                {
                  name: 'Asset name',
                  render: (record: ContentPackObject) => {
                    if (record.type === 'saved_object') {
                      const { content } = record as ContentPackSavedObject;

                      if (content.type === 'dashboard') {
                        return (content.attributes as DashboardAttributes).title;
                      }
                    }

                    return 'unknown object type';
                  },
                  truncateText: true,
                },
                {
                  name: 'Type',
                  render: (record: ContentPackObject) => {
                    const type = record.type === 'saved_object' ? record.content.type : record.type;
                    const iconType = 'dashboardApp';
                    return (
                      <EuiBadge color="hollow" iconType={iconType} iconSide="left">
                        {capitalize(type)}
                      </EuiBadge>
                    );
                  },
                },
              ]}
              rowHeader="objectName"
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="streamsAppModalFooterButton"
          isLoading={isLoadingContentPack}
          fill
          onClick={() => {
            if (!exportResponse || exportResponse.objects.length === 0) {
              return;
            }

            const replacements = Object.keys(indexPatternReplacements).reduce((acc, index) => {
              if (indexPatternReplacements[index]) {
                acc[index] = INDEX_PLACEHOLDER;
              }
              return acc;
            }, {} as Record<string, string>);

            saveAs(
              new Blob(
                [
                  JSON.stringify({
                    ...exportResponse.contentPack,
                    content: exportResponse.objects
                      .map((object) => {
                        if (object.type === 'saved_object' && object.content.type === 'dashboard') {
                          return JSON.stringify(replaceIndexPatterns(object, replacements));
                        }

                        return JSON.stringify(object);
                      })
                      .join('\n'),
                  }),
                ],
                { type: 'application/json' }
              ),
              `${exportResponse.contentPack.name}.json`
            );

            onExport();
          }}
        >
          {i18n.translate('xpack.streams.exportContentPackFlyout.exportObjects', {
            defaultMessage: 'Export objects',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
