/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TITLE = i18n.translate('xpack.agenticInvestigations.detailsFlyout.learnings.title', {
  defaultMessage: 'Learnings',
});

const BODY = i18n.translate('xpack.agenticInvestigations.detailsFlyout.learnings.body', {
  defaultMessage: 'This will show what Elastic Nightshift learned during the investigation.',
});

/** A placeholder until the learnings of an investigation are recorded. */
export const LearningsTab: React.FC = () => (
  <EuiEmptyPrompt
    data-test-subj="agenticInvestigationsLearningsPlaceholder"
    iconType="training"
    title={<h3>{TITLE}</h3>}
    titleSize="xs"
    body={<p>{BODY}</p>}
  />
);
