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
  EuiText,
} from '@elastic/eui';
import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';

import { HeaderSection } from '../../../../../components/header_section';
import { Markdown } from '../../../../../components/markdown';
import { AboutStepRule, AboutStepRuleDetails } from '../../types';
import * as i18n from './translations';
import { StepAboutRule } from '../step_about_rule/';

const toggleOptions: EuiButtonGroupOption[] = [
  {
    id: 'about',
    label: i18n.ABOUT_PANEL_DETAILS_TAB,
  },
  {
    id: 'notes',
    label: i18n.ABOUT_PANEL_NOTES_TAB,
  },
];

interface StepPanelProps {
  stepData: AboutStepRule | null;
  stepDataDetails: AboutStepRuleDetails | null;
  loading: boolean;
}

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

const AboutDescriptionContainer = styled(EuiFlexItem)`
  max-height: 550px;
  overflow-y: hidden;
`;

const AboutDescriptionScrollContainer = styled.div`
  overflow-x: hidden;
`;

const StepAboutRuleToggleDetailsComponent: React.FC<StepPanelProps> = ({
  stepData,
  stepDataDetails,
  loading,
}) => {
  const [selectedToggleOption, setToggleOption] = useState('about');

  return (
    <MyPanel>
      {loading && (
        <>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <HeaderSection title={i18n.ABOUT_TEXT} />
        </>
      )}
      {stepData != null && stepDataDetails != null && (
        <>
          <HeaderSection title={i18n.ABOUT_TEXT}>
            {!isEmpty(stepDataDetails.note) && (
              <EuiButtonGroup
                options={toggleOptions}
                idSelected={selectedToggleOption}
                onChange={val => {
                  setToggleOption(val);
                }}
              />
            )}
          </HeaderSection>
          <AboutDescriptionContainer>
            <AboutDescriptionScrollContainer className="eui-yScrollWithShadows">
              {selectedToggleOption === 'about' ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" data-test-subj="stepAboutRuleDetailsToggleDescriptionText">
                    <p>{stepDataDetails.description}</p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <StepAboutRule
                    descriptionColumns="singleSplit"
                    isReadOnlyView={true}
                    isLoading={false}
                    defaultValues={stepData}
                  />
                </>
              ) : (
                <Markdown raw={stepDataDetails.note} />
              )}
            </AboutDescriptionScrollContainer>
          </AboutDescriptionContainer>
        </>
      )}
    </MyPanel>
  );
};

export const StepAboutRuleToggleDetails = memo(StepAboutRuleToggleDetailsComponent);
