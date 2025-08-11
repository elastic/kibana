/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTourStep, EuiButtonEmpty } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGlobalFleetTours } from '../../../../../../hooks';

export const AgentExportCSVTour: React.FC = () => {
  const { shouldShowTour, nextTour } = useGlobalFleetTours('AGENT_EXPORT_CSV', {
    isConditionMet: () => true,
  });

  const [tourState, setTourState] = useState({ isOpen: true });
  const onFinish = () => {
    setTourState({ isOpen: false });
    nextTour();
  };

  return (
    <>
      <EuiTourStep
        content={
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentExportCSVTour.tourContent"
              defaultMessage="Once you have selected the agents, click the action menu to download the CSV file."
            />
          </EuiText>
        }
        isStepOpen={shouldShowTour() && tourState.isOpen}
        onFinish={onFinish}
        minWidth={360}
        maxWidth={360}
        step={1}
        stepsTotal={1}
        title={
          <FormattedMessage
            id="xpack.fleet.agentExportCSVTour.tourTitle"
            defaultMessage="Download CSV file"
          />
        }
        anchorPosition="upLeft"
        footerAction={
          <EuiButtonEmpty onClick={onFinish}>
            <FormattedMessage id="xpack.fleet.tour.finishButton" defaultMessage="Finish" />
          </EuiButtonEmpty>
        }
        anchor="#agentListSelectionText"
      />
    </>
  );
};
