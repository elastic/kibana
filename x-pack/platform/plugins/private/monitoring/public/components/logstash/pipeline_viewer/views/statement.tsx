/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiCodeBlock, EuiFlexItem, logicalCSS, UseEuiTheme } from '@elastic/eui';

import { PluginStatement as PluginStatementModel } from '../models/pipeline/plugin_statement';
import { CollapsibleStatement } from './collapsible_statement';
import { IfElement } from '../models/list/if_element';
import { PluginStatement } from './plugin_statement';
import { Vertex } from './types';

const spaceContainerStyle = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  align-self: stretch;
  display: flex;
  // Separates the left border spaces properly
  ${logicalCSS('border-bottom', `solid 2px ${euiTheme.colors.emptyShade}`)}
`;

const spacerStyle = ({ euiTheme }: UseEuiTheme) => css`
  width: ${euiTheme.size.m};
  align-self: stretch;
  ${logicalCSS('margin-left', euiTheme.size.m)}
  ${logicalCSS('border-left', `1px ${euiTheme.border.color} dashed`)}

  // This allows the border to be flush
  &:last-child {
    width: 0;
  }

  &:first-child {
    // Odd number is because of the single pixel border
    ${logicalCSS('margin-left', `calc(${euiTheme.size.l}) - 1px)`)}
  }

  @media (min-width: var(${euiTheme.breakpoint.m})) {
    border: none;
  }
`;

const listItemStyle = ({ euiTheme }: UseEuiTheme) => css`
  display: flex;
  min-height: ${euiTheme.size.xl};
  align-items: center;
  ${logicalCSS('padding-right', euiTheme.size.m)}

  &:nth-child(2n + 1) {
    background: ${euiTheme.colors.lightestShade};
  }
`;

const conditionalStyle = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.bold};
`;

function renderStatementName(name: string, onVertexSelected: MouseEventHandler<HTMLButtonElement>) {
  return (
    <EuiFlexItem grow={false} key="statementName">
      <EuiButtonEmpty
        aria-label={name}
        color="text"
        size="xs"
        onClick={onVertexSelected}
        flush="left"
      >
        <span css={conditionalStyle}>{name}</span>
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}

function renderIfStatement(
  { condition }: { vertex?: Vertex; condition?: string },
  onVertexSelected: MouseEventHandler<HTMLButtonElement>
) {
  return [
    renderStatementName('if', onVertexSelected),
    <EuiFlexItem key="ifContent" grow={false}>
      <EuiCodeBlock fontSize="s" paddingSize="none" transparentBackground={true}>
        {condition}
      </EuiCodeBlock>
    </EuiFlexItem>,
  ];
}

function getStatementBody(
  isIf: boolean,
  statement: { vertex?: Vertex; condition?: string },
  vertex: Vertex,
  onShowVertexDetails: (vertex: Vertex) => void
) {
  const showVertexDetailsClicked = () => {
    onShowVertexDetails(vertex);
  };

  return isIf
    ? renderIfStatement(statement, showVertexDetailsClicked)
    : renderStatementName('else', showVertexDetailsClicked);
}

function renderNestingSpacers(depth: number) {
  const spacers = [];

  for (let i = 0; i < depth; i += 1) {
    spacers.push(<div key={`spacer_${i}`} css={spacerStyle} />);
  }

  return spacers;
}

interface StatementProps {
  collapse: () => void;
  element: {
    depth: number;
    id: string;
    statement: {
      vertex: Vertex;
    };
  };
  expand: () => void;
  isCollapsed: boolean;
  onShowVertexDetails: (vertex: Vertex) => void;
}

function renderStatement({
  collapse,
  element,
  element: {
    id,
    statement,
    statement: { vertex },
  },
  expand,
  isCollapsed,
  onShowVertexDetails,
}: StatementProps) {
  if (statement instanceof PluginStatementModel) {
    return <PluginStatement statement={statement} onShowVertexDetails={onShowVertexDetails} />;
  }

  const statementBody = getStatementBody(
    element instanceof IfElement,
    statement,
    vertex,
    onShowVertexDetails
  );

  return (
    <CollapsibleStatement expand={expand} collapse={collapse} isCollapsed={isCollapsed} id={id}>
      {statementBody}
    </CollapsibleStatement>
  );
}

export function Statement(props: StatementProps) {
  const { depth } = props.element;

  return (
    <li className={`monPipelineViewer__listItem`} css={listItemStyle}>
      <div css={spaceContainerStyle}>{renderNestingSpacers(depth)}</div>
      {renderStatement(props)}
    </li>
  );
}
