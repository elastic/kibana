/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AssistantCallToAction, type AssistantCallToActionProps } from '../call_to_action';

import { translations } from './no_connector_access.translations';
import { CallToActionCard } from '../call_to_action_panel';

/** Props for the `NoConnectorAccess` CTA component. */
type NoConnectorAccessProps = Pick<AssistantCallToActionProps, 'data-test-subj' | 'centered'>;

/**
 * A call to action that is displayed if the user does not have permission or ability to add a connector.
 */
export const NoConnectorAccess = (props: NoConnectorAccessProps) => (
  <AssistantCallToAction description={translations.description} {...props}>
    <CallToActionCard
      iconType="lock"
      color="warning"
      title={translations.cardTitle}
      description={translations.cardDescription}
    />
  </AssistantCallToAction>
);
