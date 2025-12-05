/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiText, EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { PhaseExceptDelete } from '../../../../../../common/types';

import { usePhaseTimings } from '../../form';

import { InfinityIconSvg } from '../infinity_icon/infinity_icon.svg';

const deleteDataLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.phaseTiming.beforeDeleteDescription',
  {
    defaultMessage: 'Delete data after this phase',
  }
);

const keepDataLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.phaseTiming.foreverTimingDescription',
  {
    defaultMessage: 'Keep data in this phase forever',
  }
);

interface Props {
  phase: PhaseExceptDelete;
}

export const PhaseFooter: FunctionComponent<Props> = ({ phase }) => {
  const {
    isDeletePhaseEnabled,
    setDeletePhaseEnabled: setValue,
    [phase]: phaseConfiguration,
  } = usePhaseTimings();

  if (!phaseConfiguration.isFinalDataPhase) {
    return null;
  }
  const selectedButton = isDeletePhaseEnabled
    ? 'ilmEnableDeletePhaseButton'
    : 'ilmDisableDeletePhaseButton';

  const buttons = [
    {
      id: `ilmDisableDeletePhaseButton`,
      label: keepDataLabel,
      iconType: InfinityIconSvg,
    },
    {
      id: `ilmEnableDeletePhaseButton`,
      label: deleteDataLabel,
      iconType: 'trash',
      'data-test-subj': 'enableDeletePhaseButton',
    },
  ];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {isDeletePhaseEnabled ? deleteDataLabel : keepDataLabel}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.deletePhase.buttonGroupLegend',
            { defaultMessage: 'Enable or disable delete phase' }
          )}
          options={buttons}
          idSelected={selectedButton}
          onChange={(id) => {
            setValue(id === 'ilmEnableDeletePhaseButton');
          }}
          isIconOnly={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
