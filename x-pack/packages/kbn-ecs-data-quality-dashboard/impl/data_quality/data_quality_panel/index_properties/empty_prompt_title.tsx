/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface Props {
  title: string;
}

const EmptyPromptTitleComponent: React.FC<Props> = ({ title }) => (
  <h2 data-test-subj="emptyPromptTitle">{title}</h2>
);

EmptyPromptTitleComponent.displayName = 'EmptyPromptTitleComponent';

export const EmptyPromptTitle = React.memo(EmptyPromptTitleComponent);
