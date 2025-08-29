/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { Wrapper } from './wrapper';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailDataQuality } from '../../stream_data_quality';
import { StreamDetailDataQualityIndicator } from '../../stream_badges';
import { useDatasetQualityController } from '../../../hooks/use_dataset_quality_controller';

const wiredStreamManagementSubTabs = [
  'route',
  'enrich',
  'schemaEditor',
  'lifecycle',
  'significantEvents',
  'dataQuality',
] as const;

type WiredStreamManagementSubTab = (typeof wiredStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is WiredStreamManagementSubTab {
  return wiredStreamManagementSubTabs.includes(value as WiredStreamManagementSubTab);
}

export function WiredStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  const { enrich, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  const dataQualityController = useDatasetQualityController(definition);

  const tabs = {
    lifecycle: {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.streams.managementTab.lifecycle.tooltip', {
            defaultMessage:
              'Control how long data stays in this stream. Set a custom duration or apply a shared policy.',
          })}
        >
          <span>
            {i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
              defaultMessage: 'Data retention',
            })}
          </span>
        </EuiToolTip>
      ),
    },
    route: {
      content: (
        <StreamDetailRouting definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.routingTab', {
        defaultMessage: 'Partitioning',
      }),
    },
    enrich,
    schemaEditor: {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema editor',
      }),
    },
    dataQuality: {
      content: (
        <StreamDetailDataQuality controller={dataQualityController} definition={definition} />
      ),
      label: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiToolTip
              content={i18n.translate('xpack.streams.managementTab.dataQuality.tooltip', {
                defaultMessage: 'View details about this classic stream’s data quality',
              })}
            >
              <span>
                {i18n.translate('xpack.streams.streamDetailView.qualityTab', {
                  defaultMessage: 'Data quality',
                })}
              </span>
            </EuiToolTip>
          </EuiFlexItem>
          <StreamDetailDataQualityIndicator controller={dataQualityController} />
          <EuiFlexItem />
        </EuiFlexGroup>
      ),
    },
    ...otherTabs,
  };

  if (!isValidManagementSubTab(tab) || tabs[tab] === undefined) {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'route' } }} />;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
