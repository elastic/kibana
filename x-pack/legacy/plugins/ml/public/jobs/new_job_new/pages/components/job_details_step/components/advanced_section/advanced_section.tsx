/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { ModelPlotSwitch } from './components/model_plot';
import { DedicatedIndexSwitch } from './components/dedicated_index';
import { ModelMemoryLimitInput } from './components/model_memory_limit';

const ButtonContent = i18n.translate(
  'xpack.ml.newJob.wizard.jobDetailsStep.advancedSectionButton',
  {
    defaultMessage: 'Advanced',
  }
);

interface Props {
  advancedExpanded: boolean;
  setAdvancedExpanded: (a: boolean) => void;
}

export const AdvancedSection: FC<Props> = ({ advancedExpanded, setAdvancedExpanded }) => {
  return (
    <EuiAccordion
      id="advanced-section"
      buttonContent={ButtonContent}
      onToggle={setAdvancedExpanded}
      initialIsOpen={advancedExpanded}
      data-test-subj="mlJobWizardToggleAdvancedSection"
    >
      <EuiSpacer />
      <EuiFlexGroup
        gutterSize="xl"
        style={{ marginLeft: '0px', marginRight: '0px' }}
        data-test-subj="mlJobWizardAdvancedSection"
      >
        <EuiFlexItem>
          <ModelPlotSwitch />
          <ModelMemoryLimitInput />
        </EuiFlexItem>
        <EuiFlexItem>
          <DedicatedIndexSwitch />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
