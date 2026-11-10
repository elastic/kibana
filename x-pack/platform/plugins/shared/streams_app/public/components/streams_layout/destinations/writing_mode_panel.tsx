/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiFormPrepend,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DESTINATION_FIXED_INDEX_MODE_LABEL,
  WRITING_MODE_STEP_TITLE,
} from './destination_type_config';
import type { StaticIndexNaming } from './types';

export const AUTOMATIC_MODE_LABEL = i18n.translate(
  'xpack.streams.destinations.automaticModeLabel',
  { defaultMessage: 'Automatic' }
);

export const UNNAMED_SIGNALS_HELP = i18n.translate(
  'xpack.streams.destinations.unnamedSignalsHelp',
  { defaultMessage: 'Unnamed signals will be ignored and skipped.' }
);

export const INDEX_NAME_PREPEND = i18n.translate('xpack.streams.destinations.indexNamePrepend', {
  defaultMessage: 'Index name',
});

/** Mode radios shared by the local and remote writing mode steps, with the mode's fields below. */
export const WritingModePanel = ({
  auto,
  disabled,
  radioName,
  onModeChange,
  children,
}: {
  auto: boolean;
  disabled: boolean;
  radioName: string;
  onModeChange: (auto: boolean) => void;
  children?: ReactNode;
}) => {
  const autoRadioId = useGeneratedHtmlId({ prefix: `${radioName}Auto` });
  const fixedRadioId = useGeneratedHtmlId({ prefix: `${radioName}Fixed` });
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFormFieldset legend={{ children: WRITING_MODE_STEP_TITLE, display: 'hidden' }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiRadio
              id={autoRadioId}
              name={radioName}
              label={AUTOMATIC_MODE_LABEL}
              checked={auto}
              disabled={disabled}
              onChange={() => onModeChange(true)}
              data-test-subj="streamsCreateDestinationAuto"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge>
              {i18n.translate('xpack.streams.destinations.recommendedBadge', {
                defaultMessage: 'Recommended',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="question"
              color="subdued"
              aria-label={i18n.translate('xpack.streams.destinations.writingModeTooltipAriaLabel', {
                defaultMessage: 'About writing modes',
              })}
              content={
                <FormattedMessage
                  id="xpack.streams.destinations.writingModeTooltip"
                  defaultMessage="{automatic} uses each document's metadata to decide its index. {fixed} sends every document of a signal to one index you name."
                  values={{
                    automatic: <strong>{AUTOMATIC_MODE_LABEL}</strong>,
                    fixed: (
                      <strong>
                        {i18n.translate('xpack.streams.destinations.fixedModeShortLabel', {
                          defaultMessage: 'Fixed',
                        })}
                      </strong>
                    ),
                  }}
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiRadio
          id={fixedRadioId}
          name={radioName}
          label={DESTINATION_FIXED_INDEX_MODE_LABEL}
          checked={!auto}
          disabled={disabled}
          onChange={() => onModeChange(false)}
          data-test-subj="streamsCreateDestinationFixedIndex"
        />
      </EuiFormFieldset>
      {children && (
        <>
          <EuiHorizontalRule margin="m" />
          {children}
        </>
      )}
    </EuiPanel>
  );
};

export const NamingButtonGroup = ({
  naming,
  disabled,
  onChange,
}: {
  naming: StaticIndexNaming;
  disabled: boolean;
  onChange: (naming: StaticIndexNaming) => void;
}) => (
  <EuiButtonGroup
    legend={i18n.translate('xpack.streams.destinations.indexNamingLegend', {
      defaultMessage: 'Fixed index naming',
    })}
    isFullWidth
    isDisabled={disabled}
    options={[
      {
        id: 'shared',
        label: i18n.translate('xpack.streams.destinations.sharedNamingLabel', {
          defaultMessage: 'One name for all signals',
        }),
        'data-test-subj': 'streamsCreateDestinationIndexNaming-shared',
      },
      {
        id: 'perSignal',
        label: i18n.translate('xpack.streams.destinations.perSignalNamingLabel', {
          defaultMessage: 'Name each signal',
        }),
        'data-test-subj': 'streamsCreateDestinationIndexNaming-perSignal',
      },
    ]}
    idSelected={naming}
    onChange={(id) => onChange(id as StaticIndexNaming)}
    data-test-subj="streamsCreateDestinationIndexNaming"
  />
);

/** Shaded box holding the signal fields of a writing mode, with an optional line above them. */
export const SignalFieldsBox = ({
  help,
  isHelpError = false,
  children,
}: {
  help?: string;
  isHelpError?: boolean;
  children: ReactNode;
}) => (
  <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
    {help && (
      <>
        <EuiText size="xs" color={isHelpError ? 'danger' : 'subdued'}>
          <p>{help}</p>
        </EuiText>
        <EuiSpacer size="s" />
      </>
    )}
    {children}
  </EuiPanel>
);

/** Text prepend with one width for every row, so the inputs line up. */
export const SignalPrepend = ({ label }: { label: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFormPrepend
      label={label}
      css={css`
        inline-size: ${euiTheme.base * 6}px;
      `}
    />
  );
};
