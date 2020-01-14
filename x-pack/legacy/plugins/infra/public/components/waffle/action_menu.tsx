/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPopover,
  EuiText,
  EuiListGroup,
  EuiSpacer,
  EuiHorizontalRule,
  PopoverAnchorPosition,
} from '@elastic/eui';

import React, { useCallback, ReactNode } from 'react';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';

interface Props {
  sections: Section[];
  otherLinks?: EuiListGroupItemProps[];

  button: NonNullable<ReactNode>;
  anchorPosition?: PopoverAnchorPosition;
  id?: string;
  isOpen?: boolean;
  closePopover(): void;
}

interface Section {
  title: string;
  description: string;
  links: EuiListGroupItemProps[];
}

export const ActionMenu = (props: Props) => {
  const { closePopover, button, anchorPosition, isOpen, id, sections, otherLinks } = props;

  const linkWithDefaults = useCallback((link: EuiListGroupItemProps) => {
    link.style = { ...link.style, padding: 0 };
    link.size = link.size || 's';
    return link;
  }, []);

  return (
    <EuiPopover
      closePopover={closePopover}
      id={id}
      isOpen={isOpen}
      button={button}
      anchorPosition={anchorPosition}
    >
      <>
        {sections.map((s, idx) => (
          <React.Fragment key={s.title}>
            <EuiText size={'s'} grow={false}>
              <h5>{s.title}</h5>
            </EuiText>
            <EuiSpacer size={'s'} />
            <EuiText size={'xs'} color={'subdued'} grow={false}>
              <small>{s.description}</small>
            </EuiText>
            <EuiSpacer size={'s'} />
            <EuiListGroup
              flush={true}
              bordered={false}
              listItems={s.links.map(l => linkWithDefaults(l))}
            />
            {idx !== sections.length - 1 && <EuiSpacer size={'l'} />}
          </React.Fragment>
        ))}
        {otherLinks?.length && (
          <div>
            <EuiHorizontalRule margin={'s'} />
            <EuiListGroup
              flush={true}
              bordered={false}
              listItems={otherLinks.map(l => linkWithDefaults(l))}
            />
          </div>
        )}
      </>
    </EuiPopover>
  );
};
