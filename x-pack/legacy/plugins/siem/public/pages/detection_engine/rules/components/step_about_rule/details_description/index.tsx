/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPanel,
  EuiProgress,
  EuiButtonGroup,
  EuiButtonGroupOption,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { upperFirst, isEmpty } from 'lodash/fp';

import { HeaderSection } from '../../../../../../components/header_section';
import { Markdown } from '../../../../../../components/markdown';
import { AboutStepRule, AboutStepRuleDetails } from '../../../types';
import { StepAboutRule } from '../';

const toggleOptions: EuiButtonGroupOption[] = [
  {
    id: 'about',
    label: 'Details',
  },
  {
    id: 'notes',
    label: 'Notes',
  },
];

interface StepPanelProps {
  stepData: AboutStepRuleDetails;
  loading: boolean;
}

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

const StepAboutRuleToggleDetailsComponent: React.FC<StepPanelProps> = ({ stepData, loading }) => {
  const [selectedToggleOption, setToggleOption] = useState('about');

  return (
    <MyPanel>
      {loading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <HeaderSection title={upperFirst(selectedToggleOption)}>
        {!isEmpty(stepData.note) && (
          <EuiButtonGroup
            options={toggleOptions}
            idSelected={selectedToggleOption}
            onChange={val => {
              setToggleOption(val);
            }}
          />
        )}
      </HeaderSection>
      {selectedToggleOption === 'about' ? (
        <>
          <div data-test-subj="stepAboutRuleDetailsToggleDescriptionText">
            {stepData.descriptionDetails}
          </div>
          <EuiSpacer size="m" />
          <StepAboutRule
            descriptionColumns="singleSplit"
            isReadOnlyView={true}
            isLoading={false}
            defaultValues={stepData}
          />
        </>
      ) : (
        <Markdown raw={stepData.note} />
      )}
    </MyPanel>
  );
};

export const StepAboutRuleToggleDetails = memo(StepAboutRuleToggleDetailsComponent);
