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
  mathWithUnits,
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

const useReadOnlyPrependBorder = () => {
  const { euiTheme } = useEuiTheme();
  return `${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border}`;
};

/** Fixed text in a field (`logs-`, `.otel-`, `Documents`), shaded like the read-only prepend in Figma. */
export const ReadOnlyPrepend = ({
  label,
  slot = 'prepend',
}: {
  label: string;
  slot?: 'prepend' | 'delimiter';
}) => {
  const { euiTheme } = useEuiTheme();
  const border = useReadOnlyPrependBorder();
  // Negative margins cancel the padding EUI puts around a prepend and a delimiter, so the shading reaches the box edges.
  const margin =
    slot === 'prepend'
      ? `-${euiTheme.size.xs}`
      : `0 calc(-1 * (${euiTheme.size.xs} + ${euiTheme.size.xxs}))`;
  return (
    <span
      css={css`
        display: flex;
        align-self: stretch;
        align-items: center;
        margin: ${margin};
        white-space: nowrap;
        background-color: ${euiTheme.components.forms.prependBackground};
        ${slot === 'delimiter' ? `border-inline: ${border};` : ''}
      `}
    >
      {/* EUI centres the 12px text 1px high, so it reads as floating above the 14px input text. */}
      <EuiFormPrepend
        label={label}
        css={css({ insetBlockStart: mathWithUnits(euiTheme.size.xxs, (xxs) => xxs / 2) })}
      />
    </span>
  );
};

/** For the input after a ReadOnlyPrepend, which EUI lays 1px over the prepend, so the input draws the line between them. */
export const useAfterReadOnlyPrependStyles = () => {
  const border = useReadOnlyPrependBorder();
  return css({ borderInlineStart: border, borderStartStartRadius: 0, borderEndStartRadius: 0 });
};
