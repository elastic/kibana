/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';

import type { Props } from './template_details_content';
import { TemplateDetailsContent } from './template_details_content';

export const TemplateDetails = (props: Props) => {
  return (
    <EuiFlyout
      onClose={props.onClose}
      data-test-subj="templateDetails"
      aria-labelledby="templateDetailsFlyoutTitle"
    >
      <TemplateDetailsContent {...props} />
    </EuiFlyout>
  );
};
