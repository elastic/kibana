/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFormRow, EuiFieldText, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDebouncedValue } from '@kbn/visualization-utils';
import type { MetricStyle } from '@elastic/charts';
import type { ToolbarPopoverProps } from '../../../shared_components';
import { ToolbarPopover } from '../../../shared_components';
import type { MetricVisualizationState, ValueFontMode } from '../types';
import { metricStateDefaults } from '../constants';

export interface TitlesAndTextPopoverProps {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
  groupPosition?: ToolbarPopoverProps['groupPosition'];
}

export const TitlesAndTextPopover: FC<TitlesAndTextPopoverProps> = ({
  state,
  setState,
  groupPosition,
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.metric.toolbarTitlesText.label', {
        defaultMessage: 'Titles and text',
      })}
      type="titlesAndText"
      groupPosition={groupPosition}
      buttonDataTestSubj="lnsTextOptionsButton"
    >
      {!state.breakdownByAccessor && (
        <SubtitleOption
          value={state.subtitle}
          onChange={(subtitle) => {
            setState({ ...state, subtitle });
          }}
        />
      )}

      <TitlesAlignmentOption
        value={state.titlesTextAlign ?? metricStateDefaults.titlesTextAlign}
        onChange={(titlesTextAlign) => {
          setState({ ...state, titlesTextAlign });
        }}
      />

      {state.icon && state.icon !== 'empty' && (
        <IconAlignmentOption
          value={state.iconAlign ?? metricStateDefaults.iconAlign}
          onChange={(iconAlign) => {
            setState({ ...state, iconAlign });
          }}
        />
      )}

      <PrimaryAlignmentOption
        value={state.primaryAlign ?? metricStateDefaults.primaryAlign}
        onChange={(primaryAlign) => {
          setState({ ...state, primaryAlign });
        }}
      />

      {/* Idea
       * When primaryposition is Bottom, only leave the values alignment
       * When primaryPosition is Top, leave two option for the alignment, primary and secondary
       */}

      <ValueFontSizeOption
        value={state.valueFontMode ?? metricStateDefaults.valueFontMode}
        onChange={(value) => {
          setState({ ...state, valueFontMode: value });
        }}
      />
    </ToolbarPopover>
  );
};

function SubtitleOption({
  value = '',
  onChange,
}: {
  value?: string;
  onChange: (subtitle: string) => void;
}) {
  const { inputValue, handleInputChange } = useDebouncedValue<string>(
    {
      onChange,
      value,
    },
    { allowFalsyValue: true }
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.metric.subtitleLabel', {
        defaultMessage: 'Subtitle',
      })}
      fullWidth
      display="columnCompressed"
    >
      <EuiFieldText
        compressed
        data-test-subj="lens-metric-subtitle-field"
        value={inputValue}
        onChange={({ target: { value: newValue } }) => handleInputChange(newValue)}
      />
    </EuiFormRow>
  );
}

const valueFontModes: Array<{
  id: ValueFontMode;
  label: string;
}> = [
  {
    id: 'default',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    id: 'fit',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.fit', {
      defaultMessage: 'Fit',
    }),
  },
];

function ValueFontSizeOption({
  value,
  onChange,
}: {
  value: (typeof valueFontModes)[number]['id'];
  onChange: (mode: ValueFontMode) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.valueFontSize', {
    defaultMessage: 'Value font size',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.valueFontSizeTip', {
              defaultMessage: 'Font size of the Primary metric value',
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
        data-test-subj="lens-value-font-mode-btn"
        buttonSize="compressed"
        idSelected={value}
        options={valueFontModes}
        onChange={(mode) => {
          onChange(mode as ValueFontMode);
        }}
      />
    </EuiFormRow>
  );
}

const alignmentOptions: Array<{
  id: MetricStyle['titlesTextAlign'] | MetricStyle['valueTextAlign'];
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

function TitlesAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['titlesTextAlign'];
  onChange: (alignment: MetricStyle['titlesTextAlign']) => void;
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
          onChange(alignment as MetricStyle['titlesTextAlign']);
        }}
      />
    </EuiFormRow>
  );
}

function PrimaryAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['valueTextAlign'];
  onChange: (alignment: MetricStyle['valueTextAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.primaryAlignment', {
    defaultMessage: 'Primary value alignment', // TODO: Check label
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
        data-test-subj="lens-values-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['valueTextAlign']);
        }}
      />
    </EuiFormRow>
  );
}

// Note: Only show when secondary metric
// function SecondaryAlignmentOption({
//   value,
//   onChange,
// }: {
//   value: MetricStyle['extraTextAlign'];
//   onChange: (alignment: MetricStyle['extraTextAlign']) => void;
// }) {
//   const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.secondaryAlignment', {
//     defaultMessage: 'Secondary value alignment', // TODO: Check label
//   });

//   return (
//     <EuiFormRow
//       display="columnCompressed"
//       label={
//         <span>
//           {label}{' '}
//           <EuiIconTip
//             color="subdued"
//             content={i18n.translate('xpack.lens.metric.toolbarTitlesText.secondaryAlignmentTip', {
//               defaultMessage: 'Alignment of the Secondary Metric',
//             })}
//             iconProps={{ className: 'eui-alignTop' }}
//             position="top"
//             size="s"
//             type="question"
//           />
//         </span>
//       }
//     >
//       <EuiButtonGroup
//         isFullWidth
//         legend={label}
//         data-test-subj="lens-values-alignment-btn"
//         buttonSize="compressed"
//         options={alignmentOptions}
//         idSelected={value}
//         onChange={(alignment) => {
//           onChange(alignment as MetricStyle['valueTextAlign']);
//         }}
//       />
//     </EuiFormRow>
//   );
// }

const iconAlignmentOptions: Array<{
  id: MetricStyle['titlesTextAlign'] | MetricStyle['valueTextAlign'];
  label: string;
}> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
  },
];

function IconAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['iconAlign'];
  onChange: (alignment: MetricStyle['iconAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.iconAlignment', {
    defaultMessage: 'Icon alignment',
  });

  return (
    <EuiFormRow display="columnCompressed" label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-icon-alignment-btn"
        buttonSize="compressed"
        options={iconAlignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['iconAlign']);
        }}
      />
    </EuiFormRow>
  );
}
