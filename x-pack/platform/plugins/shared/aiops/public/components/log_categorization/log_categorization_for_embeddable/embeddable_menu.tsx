/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopoverTitle, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import type { RandomSampler } from '../sampling_menu';
import { SamplingPanel } from '../sampling_menu/sampling_panel';
import type { MinimumTimeRangeOption } from './minimum_time_range';
import { MINIMUM_TIME_RANGE } from './minimum_time_range';

interface Props {
  randomSampler: RandomSampler;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
  categoryCount: number | undefined;
  reload: () => void;
}

const minimumTimeRangeOptions = Object.entries(MINIMUM_TIME_RANGE).map(([key, { label }]) => ({
  inputDisplay: label,
  value: key as MinimumTimeRangeOption,
}));

export const EmbeddableMenu: FC<Props> = ({
  randomSampler,
  minimumTimeRangeOption,
  setMinimumTimeRangeOption,
  categoryCount,
  reload,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const togglePopover = () => setShowMenu(!showMenu);

  const button = (
    <EuiToolTip
      content={i18n.translate('xpack.aiops.logCategorization.embeddableMenu.tooltip', {
        defaultMessage: 'Options',
      })}
    >
      <EuiButtonIcon
        data-test-subj="aiopsEmbeddableMenuOptionsButton"
        size="s"
        iconType="controlsHorizontal"
        onClick={() => togglePopover()}
        // @ts-expect-error - subdued does work
        color="subdued"
        aria-label={i18n.translate('xpack.aiops.logCategorization.embeddableMenu.aria', {
          defaultMessage: 'Pattern analysis options',
        })}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id={'embeddableMenu'}
      button={button}
      isOpen={showMenu}
      closePopover={() => togglePopover()}
      panelPaddingSize="s"
      anchorPosition="downRight"
    >
      <EuiPanel color="transparent" paddingSize="s" css={{ maxWidth: '400px' }}>
        <EuiTitle size="xxxs">
          <EuiPopoverTitle>
            <FormattedMessage
              id="xpack.aiops.logCategorization.embeddableMenu.patternAnalysisSettingsTitle"
              defaultMessage=" Pattern analysis settings"
            />
          </EuiPopoverTitle>
        </EuiTitle>
        <EuiSpacer size="s" />

        <PatternAnalysisSettings
          minimumTimeRangeOption={minimumTimeRangeOption}
          setMinimumTimeRangeOption={setMinimumTimeRangeOption}
          categoryCount={categoryCount}
        />

        <EuiHorizontalRule margin="m" />

        <SamplingPanel randomSampler={randomSampler} reload={reload} calloutPosition="bottom" />
      </EuiPanel>
    </EuiPopover>
  );
};

interface PatternAnalysisSettingsProps {
  minimumTimeRangeOption: MinimumTimeRangeOption;
  setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
  categoryCount: number | undefined;
  compressed?: boolean;
}

export const PatternAnalysisSettings: FC<PatternAnalysisSettingsProps> = ({
  minimumTimeRangeOption,
  setMinimumTimeRangeOption,
  categoryCount,
  compressed = false,
}) => {
  return (
    <>
      <EuiFormRow
        fullWidth
        data-test-subj="aiopsRandomSamplerOptionsFormRow"
        label={
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem css={{ textWrap: 'nowrap' }}>
              {i18n.translate(
                'xpack.aiops.logCategorization.embeddableMenu.minimumTimeRangeOptionsRowLabel',
                {
                  defaultMessage: 'Minimum time range',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.aiops.logCategorization.embeddableMenu.minimumTimeRange.tooltip',
                  {
                    defaultMessage:
                      'Adds a wider time range to the analysis to improve pattern accuracy.',
                  }
                )}
              >
                <EuiIcon type="questionInCircle" color="subdued" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        helpText={
          <>
            {categoryCount !== undefined && minimumTimeRangeOption !== 'No minimum' ? (
              <>
                <FormattedMessage
                  id="xpack.aiops.logCategorization.embeddableMenu.totalPatternsMessage"
                  defaultMessage="Total patterns in {minimumTimeRangeOption}: {categoryCount}"
                  values={{ minimumTimeRangeOption, categoryCount }}
                />
              </>
            ) : (
              <FormattedMessage
                id="xpack.aiops.logCategorization.embeddableMenu.totalPatternsMessage2"
                defaultMessage="No additional time will be added to the range you specified with the time selector."
              />
            )}
          </>
        }
      >
        <EuiSuperSelect
          fullWidth
          aria-label={i18n.translate(
            'xpack.aiops.logCategorization.embeddableMenu.minimumTimeRangeOptionsRowAriaLabel',
            {
              defaultMessage: 'Select a minimum time range',
            }
          )}
          options={minimumTimeRangeOptions}
          valueOfSelected={minimumTimeRangeOption}
          onChange={setMinimumTimeRangeOption}
          compressed={compressed}
        />
      </EuiFormRow>
    </>
  );
};
