/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { OsqueryIcon } from '../components/osquery_icon';
import { EMPTY_PROMPT, NOT_AVAILABLE, SHORT_EMPTY_TITLE } from './osquery_action/translations';

export const OsqueryEmptyPrompt = () => (
  <EuiEmptyPrompt
    icon={<OsqueryIcon />}
    title={<h2>{SHORT_EMPTY_TITLE}</h2>}
    titleSize="xs"
    body={<p>{EMPTY_PROMPT}</p>}
  />
);

export const OsqueryNotAvailablePrompt = () => (
  <EuiEmptyPrompt
    icon={<OsqueryIcon />}
    title={<h2>{SHORT_EMPTY_TITLE}</h2>}
    titleSize="xs"
    body={<p>{NOT_AVAILABLE}</p>}
  />
);
