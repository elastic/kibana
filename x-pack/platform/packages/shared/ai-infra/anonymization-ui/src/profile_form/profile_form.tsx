/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ProfileFormFooter } from './profile_form_footer';
import { ProfileFormContent } from './profile_form_content';
import type { ProfileFormProps } from './profile_form_props';
import { ProfileFormProvider } from './profile_form_provider';

export const ProfileForm = (props: ProfileFormProps) => (
  <ProfileFormProvider {...props}>
    <ProfileFormContent />
    <EuiSpacer size="m" />
    <ProfileFormFooter />
  </ProfileFormProvider>
);
