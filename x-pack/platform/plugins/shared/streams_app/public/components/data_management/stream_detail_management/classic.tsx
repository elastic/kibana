/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { EuiBadgeGroup, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import type { ManagementTabs } from './wrapper';
import { Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../../stream_badges';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailDataQuality } from '../../stream_data_quality';
import { StreamDetailDataQualityIndicator } from '../../stream_badges';
import { useDatasetQualityController } from '../../../hooks/use_dataset_quality_controller';

const classicStreamManagementSubTabs = [
  'enrich',
  'advanced',
  'lifecycle',
  'significantEvents',
  'dataQuality',
] as const;

type ClassicStreamManagementSubTab = (typeof classicStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is ClassicStreamManagementSubTab {
  return classicStreamManagementSubTabs.includes(value as ClassicStreamManagementSubTab);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
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

  if (!definition.data_stream_exists) {
    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamTitle', {
                defaultMessage: 'Manage stream {streamId}',
                values: { streamId: key },
              })}
              <EuiBadgeGroup gutterSize="s">
                {Streams.ClassicStream.Definition.is(definition.stream) && <ClassicStreamBadge />}
                <LifecycleBadge lifecycle={definition.effective_lifecycle} />
              </EuiBadgeGroup>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiCallOut
            title={i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.title', {
              defaultMessage: 'Data stream missing',
            })}
            color="danger"
            iconType="error"
          >
            <p>
              {i18n.translate(
                'xpack.streams.unmanagedStreamOverview.missingDatastream.description',
                {
                  defaultMessage:
                    'The underlying Elasticsearch data stream for this classic stream is missing. Recreate the data stream to restore the stream by sending data before using the management features.',
                }
              )}
            </p>
          </EuiCallOut>
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  const tabs: ManagementTabs = {};

  if (definition.data_stream_exists) {
    tabs.lifecycle = {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
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
    };
    tabs.enrich = enrich;
  }

  tabs.dataQuality = {
    content: <StreamDetailDataQuality controller={dataQualityController} definition={definition} />,
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
  };

  if (definition.privileges.manage) {
    tabs.advanced = {
      content: (
        <UnmanagedElasticsearchAssets
          definition={definition}
          refreshDefinition={refreshDefinition}
        />
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.advanced.tooltip', {
            defaultMessage:
              'View technical details about this classic stream’s underlying index setup',
          })}
        >
          <span>
            {i18n.translate('xpack.streams.streamDetailView.advancedTab', {
              defaultMessage: 'Advanced',
            })}
          </span>
        </EuiToolTip>
      ),
    };
  }

  if (otherTabs.significantEvents) {
    tabs.significantEvents = otherTabs.significantEvents;
  }

  if (!isValidManagementSubTab(tab) || tabs[tab] === undefined) {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'enrich' } }} />;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
