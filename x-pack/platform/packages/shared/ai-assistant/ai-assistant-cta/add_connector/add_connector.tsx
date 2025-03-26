/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { AssistantCallToAction } from '../call_to_action';
import { translations } from './add_connector.translations';

/**
 * Props for the `AddConnector` call to action.
 */
export interface AddConnectorProps {
  /** Callback to handle adding a connector. */
  onAddConnector: () => void;
}

/**
 * A pure component that renders a call to action to add a connector.
 */
export const AddConnector = ({ onAddConnector }: AddConnectorProps) => (
  <AssistantCallToAction description={translations.description}>
    <EuiButton onClick={onAddConnector} iconType="plusInCircle">
      {translations.addButton}
    </EuiButton>
  </AssistantCallToAction>
);
