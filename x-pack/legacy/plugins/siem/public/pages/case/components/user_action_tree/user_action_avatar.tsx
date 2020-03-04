/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar } from '@elastic/eui';
import React from 'react';

interface UserActionAvatarProps {
  name: string;
}

export const UserActionAvatar = ({ name }: UserActionAvatarProps) => {
  return (
    <EuiAvatar data-test-subj={`user-action-avatar`} className="userAction__circle" name={name} />
  );
};
