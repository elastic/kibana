/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCard, EuiIcon, IconType } from '@elastic/eui';

interface Props {
  iconType: IconType;
  title: string;
  description: string;
  onClick(): void;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const CreateJobLinkCard: FC<Props> = ({ iconType, title, description, onClick }) => (
  <EuiCard
    layout="horizontal"
    icon={<EuiIcon size="xl" type={iconType} />}
    title={title}
    description={description}
    onClick={onClick}
  />
);
