/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';

/**
 * Stands in for the investigation's own header, both while the header slot's chunk loads and when
 * the investigation cannot be resolved, so the flyout's labelling target always has text.
 */
export const ConversationTitle = ({ title }: { title: string }) => (
  <EuiTitle size="s">
    <h2>{title}</h2>
  </EuiTitle>
);
