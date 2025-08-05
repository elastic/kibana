/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
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
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { FlattenRecord } from '@kbn/streams-schema';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from '../state_management/data_source_state_machine';
import { AssetImage } from '../../../asset_image';
import { PreviewTable } from '../../preview_table';
import { DATA_SOURCES_I18N } from './translations';

interface DataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
  readonly title?: string;
  readonly subtitle?: string;
  readonly isPreviewVisible?: boolean;
}

export const DataSourceCard = ({
  children,
  dataSourceRef,
  title,
  subtitle,
  isPreviewVisible,
}: PropsWithChildren<DataSourceCardProps>) => {
  const dataSourceState = useDataSourceSelector(dataSourceRef, (snapshot) => snapshot);

  const { data: previewDocs, dataSource } = dataSourceState.context;

  const canDeleteDataSource = dataSourceState.can({ type: 'dataSource.delete' });
  const isEnabled = dataSourceState.matches('enabled');
  const isLoading =
    dataSourceState.matches({ enabled: 'loadingData' }) ||
    dataSourceState.matches({ enabled: 'debouncingChanges' });

  const toggleActivity = () => dataSourceRef.send({ type: 'dataSource.toggleActivity' });

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
    <EuiCheckableCard
      id={`dataSourceCard-${dataSourceRef.id}`}
      label={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
            <EuiTitle size="xs">
              <h3>{title ?? dataSource.type}</h3>
            </EuiTitle>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" isDisabled={!isEnabled}>
                {isEnabled
                  ? DATA_SOURCES_I18N.dataSourceCard.enabled
                  : DATA_SOURCES_I18N.dataSourceCard.disabled}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow />
            {canDeleteDataSource && (
              <EuiButtonIcon
                iconType="trash"
                onClick={deleteDataSource}
                aria-label={DATA_SOURCES_I18N.dataSourceCard.deleteDataSourceLabel}
              />
            )}
          </EuiFlexGroup>
          <EuiText component="p" color="subdued" size="xs">
            {subtitle}
          </EuiText>
        </EuiFlexGroup>
      }
      checkableType="checkbox"
      onChange={toggleActivity}
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
            height={150}
          />
        )}
      </EuiAccordion>
    </EuiCheckableCard>
  );
};
