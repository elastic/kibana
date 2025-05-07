/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { AssistantCallToAction, type AssistantCallToActionProps } from '../call_to_action';
import { translations } from './add_connector.translations';

/** Data test subject for the add connector button. */
export const DATA_TEST_SUBJ_ADD_CONNECTOR_BUTTON = 'aiCTAAddConnectorButton';

/**
 * Props for the `AddConnector` call to action.
 */
export interface AddConnectorProps
  extends Pick<AssistantCallToActionProps, 'data-test-subj' | 'centered'> {
  /** Callback to handle adding a connector. */
  onAddConnector: () => void;
}

/**
 * A pure component that renders a call to action to add a connector.
 */
export const AddConnector = ({ onAddConnector, ...props }: AddConnectorProps) => (
  <AssistantCallToAction description={translations.description} {...props}>
    <EuiButton
      onClick={onAddConnector}
      iconType="plusInCircle"
      data-test-subj={DATA_TEST_SUBJ_ADD_CONNECTOR_BUTTON}
    >
      {translations.addButton}
    </EuiButton>
  </AssistantCallToAction>
);
