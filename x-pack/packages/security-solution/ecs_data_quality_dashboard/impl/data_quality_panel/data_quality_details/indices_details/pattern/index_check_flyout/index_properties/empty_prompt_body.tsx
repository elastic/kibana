/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface Props {
  body: string;
}

const EmptyPromptBodyComponent: React.FC<Props> = ({ body }) => (
  <p data-test-subj="emptyPromptBody">{body}</p>
);

EmptyPromptBodyComponent.displayName = 'EmptyPromptBodyComponent';

export const EmptyPromptBody = React.memo(EmptyPromptBodyComponent);
