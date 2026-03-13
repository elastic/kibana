/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
  EuiButtonIcon,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  EuiProgress,
  EuiEmptyPrompt,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { useDataSourceSelector } from '../state_management/data_source_state_machine';
import { AssetImage } from '../../../asset_image';
import { PreviewTable } from '../../shared/preview_table';
import { DATA_SOURCES_I18N } from './translations';
import { useStreamEnrichmentEvents } from '../state_management/stream_enrichment_state_machine';

interface DataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
  readonly title?: string;
  readonly subtitle?: string;
  readonly isPreviewVisible?: boolean;
  readonly isForCompleteSimulation?: boolean;
  readonly 'data-test-subj'?: string;
}

export const DataSourceCard = ({
  children,
  dataSourceRef,
  title,
  subtitle,
  isPreviewVisible,
  isForCompleteSimulation = false,
  'data-test-subj': dataTestSubj,
}: PropsWithChildren<DataSourceCardProps>) => {
  const { selectDataSource } = useStreamEnrichmentEvents();
  const dataSourceState = useDataSourceSelector(dataSourceRef, (snapshot) => snapshot);

  const { data: previewDocs, dataSource } = dataSourceState.context;

  const canDeleteDataSource = dataSourceState.can({ type: 'dataSource.delete' });
  const isEnabled = dataSourceState.matches('enabled');
  const isLoading = dataSourceState.matches({ enabled: 'loadingData' });
  const isDeletableDataSource =
    dataSource.type !== 'latest-samples' && dataSource.type !== 'failure-store'; // We don't allow deleting the latest-samples or failure store data sources to always have a data source available

  const handleSelection = () => selectDataSource(dataSourceRef.id);

  const deleteDataSource = useDiscardConfirm(
    () => dataSourceRef.send({ type: 'dataSource.delete' }),
    {
      title: DATA_SOURCES_I18N.dataSourceCard.delete.title,
      message: DATA_SOURCES_I18N.dataSourceCard.delete.message,
      cancelButtonText: DATA_SOURCES_I18N.dataSourceCard.delete.cancelButtonText,
      confirmButtonText: DATA_SOURCES_I18N.dataSourceCard.delete.confirmButtonText,
    }
  );

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiCheckableCard
        id={`dataSourceCard-${dataSource.type}-${dataSourceRef.id}`}
        css={css`
          [class*='euiSplitPanel__inner']:has(> label.euiCheckableCard__label) {
            overflow-block: auto;
          }
        `}
        label={
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m" wrap>
              <EuiTitle size="xs">
                <h3>{title ?? dataSource.type}</h3>
              </EuiTitle>
              {isForCompleteSimulation ? <CompleteSimulationBadge /> : <PartialSimulationBadge />}
              <EuiFlexItem grow />
              {isDeletableDataSource && (
                <EuiToolTip
                  content={
                    !canDeleteDataSource
                      ? DATA_SOURCES_I18N.dataSourceCard.deleteDataSourceDisabledLabel
                      : undefined
                  }
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="trash"
                    disabled={!canDeleteDataSource}
                    onClick={deleteDataSource}
                    aria-label={DATA_SOURCES_I18N.dataSourceCard.deleteDataSourceLabel}
                  />
                </EuiToolTip>
              )}
            </EuiFlexGroup>
            <EuiText component="p" color="subdued" size="xs">
              {subtitle}
            </EuiText>
          </EuiFlexGroup>
        }
        onChange={handleSelection}
        checked={isEnabled}
      >
        {children}
        <EuiAccordion
          id={dataSourceRef.id}
          buttonContent={DATA_SOURCES_I18N.dataSourceCard.dataPreviewAccordionLabel}
          initialIsOpen={isPreviewVisible}
        >
          <EuiSpacer size="s" />
          {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
          {isEmpty(previewDocs) ? (
            <EuiEmptyPrompt
              icon={<AssetImage type="noResults" size="s" />}
              titleSize="xs"
              title={<h4>{DATA_SOURCES_I18N.dataSourceCard.noDataPreview}</h4>}
            />
          ) : (
            <PreviewTable
              documents={previewDocs.map(flattenObjectNestedLast) as FlattenRecord[]}
              height={350}
            />
          )}
        </EuiAccordion>
      </EuiCheckableCard>
    </div>
  );
};

export const PartialSimulationBadge = ({ short = false }: { short?: boolean }) => {
  const label = short
    ? i18n.translate('xpack.streams.dataSourceCard.partialSimulationBadgeShortLabel', {
        defaultMessage: 'Partial',
      })
    : i18n.translate('xpack.streams.dataSourceCard.partialSimulationBadgeLabel', {
        defaultMessage: 'Partial simulation',
      });
  return (
    <EuiToolTip
      content={
        short
          ? i18n.translate('xpack.streams.dataSourceCard.partialSimulationBadgeLabel', {
              defaultMessage:
                'This data source can only simulate the part of the pipeline that includes the newly added processors, because the original, unprocessed data content is not guaranteed.',
            })
          : undefined
      }
    >
      <EuiBadge tabIndex={0}>{label}</EuiBadge>
    </EuiToolTip>
  );
};

export const CompleteSimulationBadge = ({ short = false }: { short?: boolean }) => {
  const label = short
    ? i18n.translate('xpack.streams.dataSourceCard.completeSimulationBadgeShortLabel', {
        defaultMessage: 'Complete',
      })
    : i18n.translate('xpack.streams.dataSourceCard.completeSimulationBadgeLabel', {
        defaultMessage: 'Complete simulation',
      });
  return (
    <EuiToolTip
      content={
        short
          ? i18n.translate('xpack.streams.dataSourceCard.completeSimulationBadgeLabel', {
              defaultMessage:
                'This data source can simulate the whole pipeline, since the original data content is guaranteed.',
            })
          : undefined
      }
    >
      <EuiBadge tabIndex={0} color="primary">
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
