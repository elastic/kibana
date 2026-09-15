/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactElement } from 'react';
import { EuiButtonEmpty, EuiText, EuiTourStep, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface DisplayOptionsTourProps {
  isOpen: boolean;
  onDismiss: () => void;
  children: ReactElement;
}

export const DisplayOptionsTour = ({ isOpen, onDismiss, children }: DisplayOptionsTourProps) => {
  const { euiTheme } = useEuiTheme();
  const tourWidth = euiTheme.base * 25;

  return (
    <EuiTourStep
      content={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsTourDescription"
              defaultMessage="Toggle the visibility of models that are currently unavailable based on your region preferences."
            />
          </p>
        </EuiText>
      }
      isStepOpen={isOpen}
      onFinish={onDismiss}
      minWidth={tourWidth}
      maxWidth={tourWidth}
      step={1}
      stepsTotal={1}
      title={
        <FormattedMessage
          id="xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsTourTitle"
          defaultMessage="Region preferences are blocking some models."
        />
      }
      footerAction={
        <EuiButtonEmpty
          size="s"
          color="text"
          onClick={onDismiss}
          data-test-subj="eisDisplayOptionsTourCloseButton"
        >
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsTourCloseButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      }
      anchorPosition="downRight"
      data-test-subj="eisDisplayOptionsTour"
    >
      {children}
    </EuiTourStep>
  );
};
