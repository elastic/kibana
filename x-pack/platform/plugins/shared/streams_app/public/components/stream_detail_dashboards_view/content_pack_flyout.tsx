/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  IngestStreamGetResponse,
  ProcessorDefinition,
  isDissectProcessorDefinition,
} from '@kbn/streams-schema';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFilePicker,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import {
  DashboardAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/common/content_management/v2';
import { capitalize, uniq } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';

type ContentPackAsset = { id: string; name: string; type: string; raw: any };

export function processorLabel(processor: ProcessorDefinition) {
  return isDissectProcessorDefinition(processor)
    ? `Dissect processor (field: ${processor.dissect.field} | pattern: ${processor.dissect.pattern})`
    : // @ts-ignore
      `Grok processor (field: ${processor.grok.field} | pattern: ${processor.grok.patterns})`;
}

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
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackAssets, setContentPackAssets] = useState<ContentPackAsset[]>([]);
  const [selectedContentPackAssets, setSelectedContentPackAssets] = useState<ContentPackAsset[]>(
    []
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
                if (content) {
                  const assets = content
                    .split('\n')
                    .map((line: string) => JSON.parse(line))
                    .filter(
                      (asset: { type?: string }) =>
                        asset.type === 'dashboard' ||
                        asset.type === 'processor' ||
                        asset.type === 'lifecycle'
                    )
                    .map((asset: any, index: number) => {
                      if (asset.type === 'dashboard') {
                        return {
                          id: asset.id,
                          name: asset.attributes.title,
                          type: asset.type,
                          raw: asset,
                        };
                      }

                      if (asset.type === 'lifecycle') {
                        return {
                          id: `lifecycle-${index}`,
                          type: asset.type,
                          name: 'Lifecycle',
                          raw: asset,
                        };
                      }

                      return {
                        id: `processor-${index}`,
                        type: asset.type,
                        name: processorLabel(asset.processor),
                        raw: asset,
                      };
                    });
                  setContentPackAssets(assets);
                }
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

            <EuiBasicTable
              items={contentPackAssets}
              itemId="id"
              columns={[
                {
                  field: 'name',
                  name: 'Asset name',
                  sortable: true,
                  truncateText: true,
                },
                {
                  field: 'type',
                  name: 'Type',
                  sortable: true,
                  render: (type: string) => {
                    const iconType =
                      type === 'dashboard'
                        ? 'dashboardApp'
                        : type === 'processor'
                        ? 'pipelineApp'
                        : 'pipelineApp';
                    return (
                      <EuiBadge color="hollow" iconType={iconType} iconSide="left">
                        {capitalize(type)}
                      </EuiBadge>
                    );
                  },
                },
              ]}
              selection={{
                onSelectionChange: (selectedAssets: ContentPackAsset[]) => {
                  setSelectedContentPackAssets(selectedAssets);
                },
              }}
              rowHeader="assetName"
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="streamsAppModalFooterButton"
          disabled={!file || !selectedContentPackAssets.length}
          isLoading={isLoading}
          fill
          onClick={() => {
            if (!file) return;

            setIsLoading(true);

            const body = new FormData();
            body.append(
              'content',
              new File(
                [
                  JSON.stringify({
                    content: selectedContentPackAssets
                      .map((asset) => JSON.stringify(asset.raw))
                      .join('\n'),
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
                setContentPackAssets([]);
                setFile(null);
                onImport();
              });
          }}
        >
          Import assets
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

export function findIndexPatterns(savedObjects: any[]) {
  const patterns = savedObjects.flatMap((savedObject) => {
    if (savedObject.type === 'dashboard') {
      const attributes = savedObject.attributes as DashboardAttributes;
      const panels = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];

      return panels.flatMap((panel) => {
        if (panel.type === 'lens') {
          const query = panel.embeddableConfig.query as { esql: string } | undefined;
          if (query?.esql) {
            return getIndexPatternFromESQLQuery(query.esql).split(',');
          }
        }

        return [];
      });
    }

    return [];
  });

  return uniq(patterns);
}
