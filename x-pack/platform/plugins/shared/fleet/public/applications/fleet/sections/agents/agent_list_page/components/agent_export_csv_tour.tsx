/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useDismissableTour } from '../../../../hooks';

export const AgentExportCSVTour: React.FC<{}> = () => {
  const { isOpen, dismiss } = useDismissableTour('AGENT_EXPORT_CSV');

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
        isStepOpen={isOpen}
        onFinish={dismiss}
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
        footerAction={
          <EuiButtonEmpty onClick={dismiss}>
            <FormattedMessage
              id="xpack.fleet.genericTourPopover.dismissButton"
              defaultMessage="Got it"
            />
          </EuiButtonEmpty>
        }
        anchorPosition="upLeft"
        anchor="#agentListSelectionText"
      />
    </>
  );
};
