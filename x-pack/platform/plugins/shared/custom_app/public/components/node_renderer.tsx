/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { interpolate, type AppNode } from '@kbn/custom-app-common';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import { useStateValues } from '../runtime/app_runtime_context';
import { escapeMarkdownValues } from '../utils/escape_markdown';
import { ChartNode } from './chart_node';
import {
  AccordionFrame,
  CardFrame,
  Column,
  ColumnsFrame,
  TabsFrame,
  type FrameSection,
} from './container_frames';
import { MetricNode } from './metric_node';
import { ProgressNode } from './progress_node';
import { EditableText } from './editable_text';
import { CustomContentNode } from './custom_content_node';
import { ButtonGroupNode } from './button_group_node';
import { ButtonNode } from './button_node';
import { FlyoutNode } from './flyout_node';
import { FormNode } from './form_node';
import { KeyValueNode } from './key_value_node';
import { LinkNode } from './link_node';
import { ListInputNode } from './list_input_node';
import { SearchNode } from './search_node';
import { SelectNode } from './select_node';
import { StatNode } from './stat_node';
import { SwitchNode } from './switch_node';
import { TableNode } from './table_node';
import { TimeRangeNode } from './time_range_node';

const isInput = (node: AppNode): boolean =>
  node.type === 'search' ||
  node.type === 'list_input' ||
  node.type === 'select' ||
  node.type === 'button_group' ||
  node.type === 'switch' ||
  node.type === 'time_range';

const CALLOUTS = {
  primary: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} as const;

interface NodeRendererProps {
  node: AppNode;
}

/**
 * Renders one document node. The switch is exhaustive over the schema's node types; the default
 * branch is reachable only if a document carries a type this build cannot render, and shows that
 * instead of failing the whole panel.
 */
export const NodeRenderer = ({ node }: NodeRendererProps) => {
  const state = useStateValues();
  const text = (value: string) => interpolate(value, state);

  switch (node.type) {
    case 'heading':
      return (
        <EuiTitle size="s" data-node-id={node.id}>
          <h3>
            <EditableText nodeId={node.id} field="text" words={node.text}>
              {text(node.text)}
            </EditableText>
          </h3>
        </EuiTitle>
      );
    case 'text':
      // Written in Markdown, so that bold, lists and links look as they are written. The values of
      // the app are put in as plain text: one that came from a link cannot add to the formatting.
      return (
        <div data-node-id={node.id}>
          <EuiMarkdownFormat textSize="s">
            {interpolate(node.text, escapeMarkdownValues(state))}
          </EuiMarkdownFormat>
        </div>
      );
    case 'callout': {
      const Callout = CALLOUTS[node.color];
      return (
        <Callout
          announceOnMount={false}
          title={
            <EditableText nodeId={node.id} field="title" words={node.title}>
              {text(node.title)}
            </EditableText>
          }
          size="s"
          data-node-id={node.id}
        >
          {node.text ? <p>{text(node.text)}</p> : null}
        </Callout>
      );
    }
    case 'stat':
      return <StatNode node={node} />;
    case 'metric':
      return <MetricNode node={node} />;
    case 'progress':
      return <ProgressNode node={node} />;
    case 'badge':
      return (
        <div data-node-id={node.id}>
          <EuiBadge color={node.color}>{text(node.text)}</EuiBadge>
        </div>
      );
    case 'card':
      return (
        <CardFrame
          nodeId={node.id}
          title={node.title === undefined ? undefined : text(node.title)}
          description={node.description === undefined ? undefined : text(node.description)}
          icon={node.icon}
        >
          {node.children.map((child) => (
            <NodeRenderer key={child.id} node={child} />
          ))}
        </CardFrame>
      );
    case 'columns':
      return (
        <ColumnsFrame nodeId={node.id} columns={node.columns as 2 | 3 | 4}>
          {node.children.map((child) => (
            <NodeRenderer key={child.id} node={child} />
          ))}
        </ColumnsFrame>
      );
    case 'tabs':
    case 'accordion': {
      const sections: FrameSection[] = node.children.flatMap((child) =>
        child.type === 'section'
          ? [
              {
                id: child.id,
                label: text(child.label),
                open: child.open,
                content: child.children.map((inner) => (
                  <NodeRenderer key={inner.id} node={inner} />
                )),
              },
            ]
          : []
      );
      return node.type === 'tabs' ? (
        <TabsFrame nodeId={node.id} sections={sections} />
      ) : (
        <AccordionFrame nodeId={node.id} sections={sections} />
      );
    }
    case 'section':
      // Only tabs and an accordion draw a section, with its title; on its own it shows what it holds.
      return (
        <div data-node-id={node.id}>
          <Column>
            {node.children.map((child) => (
              <NodeRenderer key={child.id} node={child} />
            ))}
          </Column>
        </div>
      );
    case 'chart':
      return <ChartNode node={node} />;
    case 'custom_content':
      return <CustomContentNode node={node} />;
    case 'table':
      return <TableNode node={node} />;
    case 'key_value':
      return <KeyValueNode node={node} />;
    case 'select':
      return <SelectNode node={node} />;
    case 'button_group':
      return <ButtonGroupNode node={node} />;
    case 'switch':
      return <SwitchNode node={node} />;
    case 'search':
      return <SearchNode node={node} />;
    case 'list_input':
      return <ListInputNode node={node} />;
    case 'button':
      return <ButtonNode node={node} />;
    case 'link':
      return <LinkNode node={node} />;
    case 'form':
      return <FormNode node={node} />;
    case 'time_range':
      return <TimeRangeNode node={node} />;
    case 'flyout':
      return (
        <FlyoutNode node={node}>
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            {node.children.map((child) => (
              <EuiFlexItem key={child.id} grow={false}>
                <NodeRenderer node={child} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </FlyoutNode>
      );
    case 'stack': {
      const isRow = node.direction === 'horizontal';
      // A row of inputs reads as a toolbar for what is below it, so it is drawn as one.
      const isFilterBar = isRow && node.children.length > 0 && node.children.every(isInput);
      const group = (
        <EuiFlexGroup
          direction={isRow ? 'row' : 'column'}
          // Stacked things get room to breathe; things side by side belong together, so sit closer.
          gutterSize={isRow ? 'm' : 'l'}
          alignItems={isFilterBar ? 'flexEnd' : 'stretch'}
          responsive={false}
          wrap={isRow}
          data-node-id={node.id}
        >
          {node.children.map((child) =>
            // A flyout draws nothing in place, so it gets no item, which would only add a gap.
            child.type === 'flyout' ? (
              <NodeRenderer key={child.id} node={child} />
            ) : child.type === 'time_range' ? (
              // The period belongs at the right, in a row of filters as on a line of its own, and
              // takes only the room it needs: it is not a filter that fills the row with the rest.
              <EuiFlexItem
                key={child.id}
                grow={false}
                css={css({ marginInlineStart: 'auto' })}
                data-test-subj="customAppTimeRangeItem"
              >
                <NodeRenderer node={child} />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem key={child.id} grow={isRow}>
                <NodeRenderer node={child} />
              </EuiFlexItem>
            )
          )}
        </EuiFlexGroup>
      );
      return isFilterBar ? (
        <EuiPanel
          color="subdued"
          paddingSize="s"
          hasShadow={false}
          borderRadius="m"
          data-test-subj="customAppFilterBar"
        >
          {group}
        </EuiPanel>
      ) : (
        group
      );
    }
    default:
      return <UnsupportedNode node={node} />;
  }
};

const UnsupportedNode = ({ node }: { node: { id?: unknown; type?: unknown } }) => (
  <KbnWarningCallout
    announceOnMount={false}
    size="s"
    title={i18n.translate('xpack.customApp.unsupportedNode.title', {
      defaultMessage: 'This component is not supported',
    })}
    data-node-id={typeof node.id === 'string' ? node.id : undefined}
  >
    <p>
      {i18n.translate('xpack.customApp.unsupportedNode.description', {
        defaultMessage: 'The component type "{type}" is unknown to this version of Kibana.',
        values: { type: String(node.type) },
      })}
    </p>
  </KbnWarningCallout>
);
