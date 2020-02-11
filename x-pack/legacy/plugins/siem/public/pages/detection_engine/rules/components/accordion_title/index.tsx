/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';

import { RuleStatusIcon, RuleStatusIconProps } from '../status_icon';

interface AccordionTitleProps extends RuleStatusIconProps {
  title: string;
}

const AccordionTitleComponent: React.FC<AccordionTitleProps> = ({ name, title, type }) => (
  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
    <EuiFlexItem grow={false}>
      <RuleStatusIcon name={name} type={type} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiTitle size="s" className="euiAccordionForm__title">
        <h6>{title}</h6>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const AccordionTitle = React.memo(AccordionTitleComponent);
