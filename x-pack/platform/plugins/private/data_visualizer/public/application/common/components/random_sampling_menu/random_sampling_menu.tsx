/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import type { RandomSampler } from '@kbn/ml-random-sampler-utils';
import { getDataTestSubject } from '../../util/get_data_test_subject';
import { RandomSamplerRangeSlider } from './random_sampler_range_slider';
import type { RandomSamplerOption } from '../../../index_data_visualizer/constants/random_sampler';
import {
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
  RANDOM_SAMPLER_SELECT_OPTIONS,
} from '../../../index_data_visualizer/constants/random_sampler';
import { ProbabilityUsedMessage } from './probability_used';

interface Props {
  randomSampler: RandomSampler;
  reload: () => void;
  id?: string;
}

export const SamplingMenu: FC<Props> = ({ randomSampler, reload, id }) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

  const samplingProbability = useObservable(
    randomSampler.getProbability$(),
    randomSampler.getProbability()
  );

  const setSamplingProbability = useCallback(
    (probability: number | null) => {
      randomSampler.setProbability(probability);
      reload();
    },
    [reload, randomSampler]
  );

  const randomSamplerPreference = useObservable(randomSampler.getMode$(), randomSampler.getMode());

  const setRandomSamplerPreference = useCallback(
    (nextPref: RandomSamplerOption) => {
      if (nextPref === RANDOM_SAMPLER_OPTION.ON_MANUAL) {
        // By default, when switching to manual, restore previously chosen probability
        // else, default to 0.001%
        const savedRandomSamplerProbability = randomSampler.getProbability();
        randomSampler.setProbability(
          savedRandomSamplerProbability &&
            savedRandomSamplerProbability > 0 &&
            savedRandomSamplerProbability <= 0.5
            ? savedRandomSamplerProbability
            : MIN_SAMPLER_PROBABILITY
        );
      }
      randomSampler.setMode(nextPref);
      reload();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSamplingProbability, randomSampler]
  );

  const { calloutInfoMessage, buttonText } = useMemo(() => {
    switch (randomSamplerPreference) {
      case RANDOM_SAMPLER_OPTION.OFF:
        return {
          calloutInfoMessage: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.offCallout.message',
            {
              defaultMessage:
                'Random sampling can be turned on to increase the speed of analysis, although some accuracy will be lost.',
            }
          ),
          buttonText: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.offCallout.button',
            {
              defaultMessage: 'No sampling',
            }
          ),
        };
      case RANDOM_SAMPLER_OPTION.ON_AUTOMATIC:
        return {
          calloutInfoMessage: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.onAutomaticCallout.message',
            {
              defaultMessage:
                'The view will use random sampler aggregations. The probability is automatically set to balance accuracy and speed.',
            }
          ),
          buttonText: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.onAutomaticCallout.button',
            {
              defaultMessage: 'Auto sampling',
            }
          ),
        };

      case RANDOM_SAMPLER_OPTION.ON_MANUAL:
      default:
        return {
          calloutInfoMessage: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.onManualCallout.message',
            {
              defaultMessage:
                'The view will use random sampler aggregations. A lower percentage probability increases performance, but some accuracy is lost.',
            }
          ),
          buttonText: i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.onManualCallout.button',
            {
              defaultMessage: 'Manual sampling',
            }
          ),
        };
    }
  }, [randomSamplerPreference]);

  return (
    <EuiPopover
      data-test-subj={getDataTestSubject('aiopsRandomSamplerOptionsPopover', id)}
      id="aiopsSamplingOptions"
      button={
        <EuiButtonEmpty
          data-test-subj={getDataTestSubject('aiopsRandomSamplerOptionsButton', id)}
          onClick={() => setShowSamplingOptionsPopover(!showSamplingOptionsPopover)}
          iconSide="right"
          iconType="arrowDown"
          size="s"
        >
          {buttonText}
        </EuiButtonEmpty>
      }
      isOpen={showSamplingOptionsPopover}
      closePopover={() => setShowSamplingOptionsPopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiPanel style={{ maxWidth: 400 }}>
        <EuiFlexItem grow={true}>
          <EuiCallOut size="s" color={'primary'} title={calloutInfoMessage} />
        </EuiFlexItem>
        <EuiSpacer size="m" />

        <EuiFormRow
          data-test-subj={getDataTestSubject('aiopsRandomSamplerOptionsFormRow', id)}
          label={i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerRowLabel',
            {
              defaultMessage: 'Random sampling',
            }
          )}
        >
          <EuiSelect
            data-test-subj={getDataTestSubject('aiopsRandomSamplerOptionsSelect', id)}
            options={RANDOM_SAMPLER_SELECT_OPTIONS}
            value={randomSamplerPreference}
            onChange={(e) => setRandomSamplerPreference(e.target.value as RandomSamplerOption)}
          />
        </EuiFormRow>

        {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_MANUAL ? (
          <RandomSamplerRangeSlider
            samplingProbability={samplingProbability}
            setSamplingProbability={setSamplingProbability}
          />
        ) : null}

        {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_AUTOMATIC ? (
          <ProbabilityUsedMessage samplingProbability={samplingProbability} />
        ) : null}
      </EuiPanel>
    </EuiPopover>
  );
};
