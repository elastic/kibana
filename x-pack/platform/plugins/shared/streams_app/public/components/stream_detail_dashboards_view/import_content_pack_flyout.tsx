/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { capitalize, omitBy, uniq } from 'lodash';
import {
  ContentPackObject,
  ContentPackSavedObject,
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
  EuiFieldText,
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
import type {
  DashboardAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/common/content_management/v2';
import { getDashboardBackupService } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../hooks/use_kibana';

export function ImportContentPackFlyout({
  definition,
  onImport,
  onClose,
}: {
  definition: IngestStreamGetResponse;
  onClose: () => void;
  onImport: () => void;
}) {
  const {
    core: { http },
    dependencies: { start },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackObject[]>([]);
  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackObject[]>(
    []
  );
  const [indexPatterns, setIndexPatterns] = useState<string[]>([]);
  const [indexPatternReplacements, setIndexPatternReplacements] = useState<Record<string, string>>(
    {}
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
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
          onChange={(files) => {
            if (files?.length) {
              const contentFile = files.item(0);
              if (!contentFile) return;

              setFile(contentFile);

              contentFile.text().then((text: string) => {
                const { content } = JSON.parse(text);
                const objects: ContentPackObject[] = content
                  .split('\n')
                  .map((line: string) => JSON.parse(line))
                  .filter(
                    (object: ContentPackObject) =>
                      object.type === 'saved_object' && object.content.type === 'dashboard'
                  );

                const indexPatterns = uniq(
                  objects.flatMap((object) => findIndexPatterns(object.content))
                ).filter((index) => !isIndexPlaceholder(index));

                setContentPackObjects(objects);
                setIndexPatterns(indexPatterns);
              });
            } else {
              setFile(null);
            }
          }}
          display={'large'}
        />

        {file ? (
          <>
            <EuiSpacer />

            {indexPatterns.length ? (
              <EuiCallOut>
                <details>
                  <summary>Advanced settings</summary>
                  <EuiSpacer />
                  <p>
                    We detected index patterns in the content pack. You can update them here or
                    later in the imported objects.
                  </p>
                  {indexPatterns.map((index) => (
                    <EuiFlexGroup alignItems="center">
                      <EuiFlexItem grow={false}>{index}</EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiFieldText
                          compressed
                          placeholder={index}
                          onChange={(e) => {
                            setIndexPatternReplacements({
                              ...indexPatternReplacements,
                              [index]: e.target.value,
                            });
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                </details>
              </EuiCallOut>
            ) : null}

            <EuiSpacer />

            <EuiBasicTable
              items={contentPackObjects}
              itemId={(record: ContentPackObject) => record.content.id}
              columns={[
                {
                  name: 'Asset name',
                  render: (record: ContentPackObject) => {
                    if (record.type === 'saved_object' && record.content.type === 'dashboard') {
                      const { content } = record as ContentPackSavedObject<DashboardAttributes>;
                      return content.attributes.title;
                    }
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
                {
                  render: (record: ContentPackObject) => {
                    const type = record.type === 'saved_object' ? record.content.type : record.type;
                    if (type === 'dashboard') {
                      return (
                        <EuiButton
                          size="s"
                          onClick={() => {
                            const service = getDashboardBackupService();
                            const updatedContent = replaceIndexPatterns(
                              record.content,
                              omitBy(indexPatternReplacements, (value) => !value)
                            );
                            const panels = JSON.parse(updatedContent.attributes.panelsJSON).reduce(
                              (
                                acc: Record<
                                  string,
                                  SavedDashboardPanel & {
                                    explicitInput: SavedDashboardPanel['embeddableConfig'];
                                  }
                                >,
                                panel: SavedDashboardPanel,
                                index: number
                              ) => {
                                acc[index] = { ...panel, explicitInput: panel.embeddableConfig };
                                return acc;
                              },
                              {}
                            );

                            service.setState(
                              'unsavedDashboard',
                              { ...record.content, panels },
                              panels
                            );

                            start.share.url.locators.get('DASHBOARD_APP_LOCATOR')?.navigate({});
                          }}
                        >
                          Preview
                        </EuiButton>
                      );
                    }
                  },
                },
              ]}
              selection={{
                onSelectionChange: (selectedObjects: ContentPackObject[]) => {
                  setSelectedContentPackObjects(selectedObjects);
                },
              }}
              rowHeader="objectName"
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="streamsAppModalFooterButton"
          disabled={!file || !selectedContentPackObjects.length}
          isLoading={isLoading}
          fill
          onClick={() => {
            if (!file) return;

            setIsLoading(true);

            const selectedObjects: ContentPackObject[] = selectedContentPackObjects.map(
              (object) => {
                if (object.type !== 'saved_object' || object.content.type !== 'dashboard') {
                  return object;
                }

                return {
                  type: 'saved_object',
                  content: replaceIndexPatterns(
                    object.content,
                    omitBy(indexPatternReplacements, (value) => !value)
                  ),
                };
              }
            );

            const body = new FormData();
            body.append(
              'content',
              new File(
                [
                  JSON.stringify({
                    content: selectedObjects.map((object) => JSON.stringify(object)).join('\n'),
                  }),
                ],
                'content.json',
                { type: 'application/json' }
              )
            );

            http
              .post(`/api/streams/${definition.stream.name}/content/import`, {
                body,
                headers: {
                  // Important to be undefined, it forces proper headers to be set for FormData
                  'Content-Type': undefined,
                },
              })
              .then(() => {
                setIsLoading(false);
                setContentPackObjects([]);
                setFile(null);
                onImport();
              });
          }}
        >
          Import objects
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
