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
} from '../../common';
import { buildDatasetRequest } from '../dataset_request';
import { getDataSourceTypeVerbose } from '../get_data_source_type_label';
import { buildDatasetPayload } from './build_dataset_payload';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { TIMESTAMP_LOGICAL_FIELD_NAME } from './constants';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
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

const ReviewColumn = ({ title, items }: { title: string; items: ReviewItem[] }) => (
  <EuiFlexItem>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescriptionList textStyle="reverse" compressed>
      {items.map(({ key, label, value, origin }) => (
        <React.Fragment key={key}>
          <EuiDescriptionListTitle>{label}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj={`createDatasetWizardReview-${key}`}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{value}</EuiFlexItem>
              {origin ? <EuiFlexItem grow={false}>{originBadge(origin)}</EuiFlexItem> : null}
            </EuiFlexGroup>
          </EuiDescriptionListDescription>
        </React.Fragment>
      ))}
    </EuiDescriptionList>
  </EuiFlexItem>
);

const getDatasetReviewItems = (
  dataset: DataSetWithName,
  dataSources: DataSource[]
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
  ];
};

const getTimestampReviewItems = (timestamp: DatasetMappingProperty | undefined): ReviewItem[] => {
  if (!timestamp) {
    return [
      {
        key: 'timestamp_mapping',
        label: createDatasetWizardStrings.timestampMappingLabel,
        value: createDatasetWizardStrings.offLabel,
        origin: 'custom',
      },
    ];
  }

  return [
    {
      key: 'timestamp_mapping',
      label: createDatasetWizardStrings.timestampMappingLabel,
      value: createDatasetWizardStrings.onLabel,
      origin: 'default',
    },
    {
      key: 'timestamp_path',
      label: createDatasetWizardStrings.timestampFieldLabel,
      value: timestamp.path ?? TIMESTAMP_LOGICAL_FIELD_NAME,
      ...(timestamp.path ? { origin: 'custom' as const } : {}),
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

const getMappingReviewItems = (mappings: DatasetMappings | undefined): ReviewItem[] => {
  const isDynamic = mappings?.dynamic !== 'false';

  return [
    {
      key: 'schema_mapping_mode',
      label: createDatasetWizardStrings.schemaMappingModeLabel,
      value: mappings
        ? createDatasetWizardStrings.schemaMappingModeDeclared
        : createDatasetWizardStrings.schemaMappingModeInferred,
      origin: mappings ? 'custom' : 'default',
    },
    {
      key: 'dynamic_fields',
      label: createDatasetWizardStrings.dynamicFieldsLabel,
      value: isDynamic ? createDatasetWizardStrings.onLabel : createDatasetWizardStrings.offLabel,
      origin: isDynamic ? 'default' : 'custom',
    },
    ...(mappings
      ? [
          {
            key: 'mapped_fields',
            label: createDatasetWizardStrings.mappedFieldsLabel,
            value: String(Object.keys(mappings.properties).length),
          },
          ...getTimestampReviewItems(mappings.properties[TIMESTAMP_LOGICAL_FIELD_NAME]),
        ]
      : []),
  ];
};

export function StepReview({ dataSources }: { dataSources: DataSource[] }) {
  const { getValues } = useFormContext<CreateDatasetFormValues>();
  const payload = buildDatasetPayload(getValues());
  const { method, path, body } = buildDatasetRequest(payload);
  const request = `${method} ${path}\n${JSON.stringify(body, null, 2)}`;

  const summaryTab = (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup data-test-subj="createDatasetWizardReviewSummaryTab">
        <ReviewColumn
          title={createDatasetWizardStrings.datasetStepLabel}
          items={getDatasetReviewItems(payload, dataSources)}
        />
        <ReviewColumn
          title={createDatasetWizardStrings.additionalStepLabel}
          items={getSettingsReviewItems(payload.settings)}
        />
        <ReviewColumn
          title={createDatasetWizardStrings.mappingStepLabel}
          items={getMappingReviewItems(payload.mappings)}
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
