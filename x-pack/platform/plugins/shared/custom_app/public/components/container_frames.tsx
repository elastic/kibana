/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiAccordion,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

/** What is inside a container, one under the other. Each is already drawn, as a child of the node. */
export const Column = ({ children }: { children: ReactNode[] }) => (
  <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
    {children.map((child, index) => (
      <EuiFlexItem key={index} grow={false}>
        {child}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

interface CardFrameProps {
  nodeId: string;
  title?: string;
  description?: string;
  icon?: string;
  children: ReactNode[];
}

/** A bordered card: a title, with an icon, and a description, over what is inside. */
export const CardFrame = ({ nodeId, title, description, icon, children }: CardFrameProps) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={nodeId}>
    {title || description || icon ? (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {icon ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color="primary" aria-hidden="true" />
            </EuiFlexItem>
          ) : null}
          {title ? (
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>{title}</h4>
              </EuiTitle>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {description ? (
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        ) : null}
        {children.length > 0 ? <div style={{ height: 12 }} /> : null}
      </>
    ) : null}
    <Column>{children}</Column>
  </EuiPanel>
);

/** What is inside side by side, in this many columns, which wrap under each other when narrow. */
export const ColumnsFrame = ({
  nodeId,
  columns,
  children,
}: {
  nodeId: string;
  columns: 2 | 3 | 4;
  children: ReactNode[];
}) => (
  <EuiFlexGrid columns={columns} gutterSize="l" data-node-id={nodeId}>
    {children.map((child, index) => (
      <EuiFlexItem key={index}>{child}</EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

export interface FrameSection {
  id: string;
  label: string;
  open?: boolean;
  content: ReactNode[];
}

/** Sections as tabs, one shown at a time. Which is shown is kept by the frame, not by the app. */
export const TabsFrame = ({ nodeId, sections }: { nodeId: string; sections: FrameSection[] }) => (
  <div data-node-id={nodeId}>
    <EuiTabbedContent
      size="s"
      tabs={sections.map(({ id, label, content }) => ({
        id,
        name: label,
        content: (
          <div style={{ paddingTop: 12 }}>
            <Column>{content}</Column>
          </div>
        ),
      }))}
    />
  </div>
);

const AccordionSection = ({ section }: { section: FrameSection }) => {
  const id = useGeneratedHtmlId({ prefix: 'customAppAccordion', suffix: section.id });
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      <EuiAccordion
        id={id}
        buttonContent={section.label}
        initialIsOpen={section.open === true}
        paddingSize="s"
      >
        <Column>{section.content}</Column>
      </EuiAccordion>
    </EuiPanel>
  );
};

/** Sections that open and close, each on its own. */
export const AccordionFrame = ({
  nodeId,
  sections,
}: {
  nodeId: string;
  sections: FrameSection[];
}) => (
  <EuiFlexGroup direction="column" gutterSize="s" responsive={false} data-node-id={nodeId}>
    {sections.map((section) => (
      <EuiFlexItem key={section.id} grow={false}>
        <AccordionSection section={section} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
