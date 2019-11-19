/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

interface Props {
  children: React.ReactNode;
  title?: string;
}

export const EditFieldSection = ({ title, children }: Props) => {
  return (
    <section className="mappingsEditor__editField__section">
      {title && (
        <>
          <EuiTitle size="s">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
        </>
      )}
      {children}
    </section>
  );
};
