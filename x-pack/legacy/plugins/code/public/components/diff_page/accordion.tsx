/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

interface Props {
  initialIsOpen: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  className: string;
}

export const Accordion = (props: Props) => {
  const [isOpen, setOpen] = useState(props.initialIsOpen);
  return (
    <EuiPanel paddingSize="none" className={props.className}>
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="spaceBetween"
        alignItems="center"
        onClick={() => {
          setOpen(!isOpen);
        }}
      >
        <EuiFlexItem>{props.title}</EuiFlexItem>
        <EuiFlexItem grow={false} className="codeAccordionCollapse__icon">
          <EuiIcon type={isOpen ? 'arrowDown' : 'arrowRight'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div hidden={!isOpen}>{props.children}</div>
    </EuiPanel>
  );
};
