/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';

import type {
  DataSetWithName,
  DataSource,
  DatasetMappingProperty,
  DatasetMappings,
} from '../../../common';
import { buildDatasetRequest } from '../../dataset_request';
import { getDataSourceTypeVerbose } from '../../get_data_source_type_label';
import { buildDatasetPayload } from '../build_dataset_payload';
import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { TIMESTAMP_LOGICAL_FIELD_NAME } from '../constants';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { fieldTypeSelectStrings } from '../mapping_step/mapping_editor/field_type_select_i18n';
import { getSettingsReviewItems, type ReviewItem } from './review_settings_items';

const displayValue = (value: string) => value.trim() || createDatasetWizardStrings.notSet;

const originBadge = (origin: ReviewItem['origin']) => {
  if (origin === 'default') {
    return <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>;
  }
  if (origin === 'custom') {
    return <EuiBadge color="primary">{createDatasetWizardStrings.customBadgeLabel}</EuiBadge>;
  }
  return null;
};

const ReviewColumn = ({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: ReviewItem[];
  emptyMessage?: string;
}) => (
  <EuiFlexItem>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    {items.length === 0 && emptyMessage ? (
      <EuiText size="s" color="subdued" data-test-subj="createDatasetWizardReviewEmptyColumn">
        {emptyMessage}
      </EuiText>
    ) : (
      <EuiDescriptionList textStyle="reverse" compressed>
        {items.map(({ key, label, value, origin }) => (
          <React.Fragment key={key}>
            <EuiDescriptionListTitle>{label}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj={`createDatasetWizardReview-${key}`}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false} css={{ whiteSpace: 'pre-wrap' }}>
                  {value}
                </EuiFlexItem>
                {origin ? <EuiFlexItem grow={false}>{originBadge(origin)}</EuiFlexItem> : null}
              </EuiFlexGroup>
            </EuiDescriptionListDescription>
          </React.Fragment>
        ))}
      </EuiDescriptionList>
    )}
  </EuiFlexItem>
);

const getDatasetReviewItems = (
  dataset: DataSetWithName,
  dataSources: DataSource[],
  datasetSettingsItems: ReviewItem[]
): ReviewItem[] => {
  const dataSourceType = dataSources.find(({ name }) => name === dataset.data_source)?.type;

  return [
    {
      key: 'data_source',
      label: createDatasetWizardStrings.dataSourceLabel,
      value: displayValue(dataset.data_source),
    },
    ...(dataSourceType
      ? [
          {
            key: 'data_source_type',
            label: createDatasetWizardStrings.dataSourceTypeLabel,
            value: getDataSourceTypeVerbose(dataSourceType),
          },
        ]
      : []),
    {
      key: 'name',
      label: createDatasetWizardStrings.nameLabel,
      value: displayValue(dataset.name),
    },
    {
      key: 'description',
      label: createDatasetWizardStrings.descriptionLabel,
      value: displayValue(dataset.description ?? ''),
    },
    {
      key: 'resource',
      label: createDatasetWizardStrings.resourceLabel,
      value: displayValue(dataset.resource),
    },
    ...datasetSettingsItems,
  ];
};

const getTimestampReviewItems = (timestamp: DatasetMappingProperty | undefined): ReviewItem[] => {
  if (!timestamp) {
    return [
      {
        key: 'timestamp_mapping',
        label: createDatasetWizardStrings.timeseriesDataLabel,
        value: createDatasetWizardStrings.offLabel,
        origin: 'custom',
      },
    ];
  }

  return [
    {
      key: 'timestamp_mapping',
      label: createDatasetWizardStrings.timeseriesDataLabel,
      value: createDatasetWizardStrings.onLabel,
      origin: 'default',
    },
    {
      key: 'timestamp_path',
      label: createDatasetWizardStrings.timestampFieldLabel,
      value: timestamp.path ?? TIMESTAMP_LOGICAL_FIELD_NAME,
      ...(timestamp.path ? { origin: 'custom' as const } : {}),
    },
    {
      key: 'timestamp_type',
      label: createDatasetWizardStrings.timestampTypeLabel,
      value:
        timestamp.type === 'date_nanos'
          ? fieldTypeSelectStrings.dateNanosOption
          : fieldTypeSelectStrings.dateOption,
      origin: timestamp.type === 'date_nanos' ? 'custom' : 'default',
    },
    ...(timestamp.format
      ? [
          {
            key: 'timestamp_format',
            label: createDatasetWizardStrings.timestampFormatLabel,
            value: timestamp.format,
            origin: 'custom' as const,
          },
        ]
      : []),
  ];
};

/** Lists the mapping in step order; only its preselected options are marked as defaults. */
const getMappingReviewItems = (
  mappings: DatasetMappings | undefined,
  mappingSettingsItems: ReviewItem[]
): ReviewItem[] => {
  const isSchemaInferred = mappings?.dynamic !== 'false';

  return [
    ...getTimestampReviewItems(mappings?.properties[TIMESTAMP_LOGICAL_FIELD_NAME]),
    {
      key: 'schema_mapping_mode',
      label: createDatasetWizardStrings.schemaMappingModeLabel,
      value: isSchemaInferred
        ? createDatasetWizardStrings.inferSchemaLabel
        : createDatasetWizardStrings.defineSchemaLabel,
      origin: isSchemaInferred ? 'default' : 'custom',
    },
    ...mappingSettingsItems,
    ...(mappings
      ? [
          {
            key: 'mapped_fields',
            label: createDatasetWizardStrings.mappedFieldsLabel,
            value: createDatasetWizardStrings.mappedFieldsCount(
              Object.keys(mappings.properties).length
            ),
            origin: 'custom' as const,
          },
        ]
      : []),
  ];
};

export function StepReview({ dataSources }: { dataSources: DataSource[] }) {
  const { getValues } = useFormContext<CreateDatasetFormValues>();
  const payload = buildDatasetPayload(getValues());
  const { method, path, body } = buildDatasetRequest(payload);
  const request = `${method} ${path}\n${JSON.stringify(body, null, 2)}`;

  const settingsItems = getSettingsReviewItems(payload.settings);

  const summaryTab = (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup data-test-subj="createDatasetWizardReviewSummaryTab">
        <ReviewColumn
          title={createDatasetWizardStrings.datasetStepLabel}
          items={getDatasetReviewItems(payload, dataSources, settingsItems.dataset)}
        />
        <ReviewColumn
          title={createDatasetWizardStrings.additionalStepLabel}
          items={settingsItems.additional}
          emptyMessage={createDatasetWizardStrings.reviewNoAdditionalSettings}
        />
        <ReviewColumn
          title={createDatasetWizardStrings.mappingStepLabel}
          items={getMappingReviewItems(payload.mappings, settingsItems.mapping)}
        />
      </EuiFlexGroup>
    </>
  );

  const requestTab = (
    <>
      <EuiSpacer size="l" />
      <EuiText size="s">
        <p>{createDatasetWizardStrings.reviewRequestDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock
        language="json"
        isCopyable
        overflowHeight={400}
        data-test-subj="createDatasetWizardReviewRequest"
      >
        {request}
      </EuiCodeBlock>
    </>
  );

  return (
    <div data-test-subj="createDatasetWizardReviewStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.reviewTitle(displayValue(payload.name))}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiTabbedContent
        data-test-subj="createDatasetWizardReviewTabs"
        tabs={[
          {
            id: 'summary',
            name: createDatasetWizardStrings.reviewSummaryTabLabel,
            content: summaryTab,
            'data-test-subj': 'createDatasetWizardReviewSummaryTabButton',
          },
          {
            id: 'request',
            name: createDatasetWizardStrings.reviewRequestTabLabel,
            content: requestTab,
            'data-test-subj': 'createDatasetWizardReviewRequestTabButton',
          },
        ]}
      />
    </div>
  );
}
