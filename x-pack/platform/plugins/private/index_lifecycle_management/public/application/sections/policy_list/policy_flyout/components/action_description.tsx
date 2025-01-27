/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export const ActionDescription = ({
  title,
  descriptionItems,
}: {
  title: string;
  descriptionItems?: string[] | ReactNode[];
}) => {
  return (
    <>
      <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
      {descriptionItems && (
        <EuiDescriptionListDescription>
          {descriptionItems.map((descriptionItem, index) => (
            <EuiText color="subdued" key={index}>
              <EuiSpacer size="s" />
              {descriptionItem}
            </EuiText>
          ))}
        </EuiDescriptionListDescription>
      )}
      <EuiSpacer size="m" />
    </>
  );
};
