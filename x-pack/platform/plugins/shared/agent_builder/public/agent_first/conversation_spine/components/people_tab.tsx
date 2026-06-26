/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const labels = {
  title: i18n.translate('xpack.agentBuilder.conversationSpine.people.emptyTitle', {
    defaultMessage: 'People',
  }),
  body: i18n.translate('xpack.agentBuilder.conversationSpine.people.emptyBody', {
    defaultMessage: 'People involved in this conversation will appear here.',
  }),
};

export const PeopleTab: React.FC = () => (
  <EuiEmptyPrompt
    icon={<EuiIcon type="users" size="xl" />}
    title={<h3>{labels.title}</h3>}
    body={labels.body}
    data-test-subj="agentBuilderConversationSpinePeopleTab"
  />
);
