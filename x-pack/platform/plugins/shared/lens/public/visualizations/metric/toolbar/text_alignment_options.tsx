/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiIconTip } from '@elastic/eui';

type TextAlign = 'left' | 'center' | 'right';

const alignmentOptions: Array<{
  id: TextAlign;
  label: string;
}> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
  },
  {
    id: 'center',
    label: i18n.translate('xpack.lens.shared.center', {
      defaultMessage: 'Center',
    }),
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
  },
];

export function TitlesAlignmentOption({
  value,
  onChange,
}: {
  value: TextAlign;
  onChange: (alignment: TextAlign) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.titlesAlignment', {
    defaultMessage: 'Titles alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.titlesAlignmentTip', {
              defaultMessage: 'Alignment of the Title and Subtitle',
            })}
            iconProps={{
              className: 'eui-alignTop',
            }}
            color="subdued"
            position="top"
            size="s"
            type="question"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-titles-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as TextAlign);
        }}
      />
    </EuiFormRow>
  );
}

export function PrimaryAlignmentOption({
  value,
  onChange,
}: {
  value: TextAlign;
  onChange: (alignment: TextAlign) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.primaryAlignment', {
    defaultMessage: 'Primary alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            color="subdued"
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.primaryAlignmentTip', {
              defaultMessage: 'Alignment of the Primary Metric',
            })}
            iconProps={{ className: 'eui-alignTop' }}
            position="top"
            size="s"
            type="question"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-primary-metric-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as TextAlign);
        }}
      />
    </EuiFormRow>
  );
}

export function SecondaryAlignmentOption({
  value,
  onChange,
}: {
  value: TextAlign;
  onChange: (alignment: TextAlign) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.secondaryMetricAlignment', {
    defaultMessage: 'Secondary alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            color="subdued"
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.secondaryAlignmentTip', {
              defaultMessage: 'Alignment of the Secondary Metric',
            })}
            iconProps={{ className: 'eui-alignTop' }}
            position="top"
            size="s"
            type="question"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-secondary-metric-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as TextAlign);
        }}
      />
    </EuiFormRow>
  );
}
