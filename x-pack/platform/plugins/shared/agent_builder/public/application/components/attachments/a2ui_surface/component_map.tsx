/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiBasicTable,
  EuiDescriptionList,
  EuiButton,
  EuiHorizontalRule,
  EuiIcon,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn, EuiButtonProps } from '@elastic/eui';
import type { PanelColor } from '@elastic/eui/src/components/panel/panel';
import { A2UIComponentType } from '@kbn/agent-builder-common/attachments';
import type { A2UIComponent } from '@kbn/agent-builder-common/attachments';
import { resolveDynamicString, resolveDynamicValue, resolveDataPath } from './data_model';
import { VisualizationRefRenderer } from './visualization_ref';

const PANEL_COLORS: ReadonlySet<string> = new Set([
  'transparent', 'plain', 'subdued', 'highlighted',
  'accent', 'accentSecondary', 'primary', 'success', 'warning', 'danger', 'neutral', 'risk',
]);

const BUTTON_COLORS: ReadonlySet<string> = new Set([
  'text', 'accent', 'accentSecondary', 'primary', 'success', 'warning', 'danger',
]);

const toPanelColor = (color: string | undefined): PanelColor | undefined =>
  color !== undefined && PANEL_COLORS.has(color) ? (color as PanelColor) : undefined;

const toButtonColor = (color: string | undefined): EuiButtonProps['color'] =>
  color !== undefined && BUTTON_COLORS.has(color)
    ? (color as EuiButtonProps['color'])
    : undefined;

export interface ComponentRenderContext {
  dataModel: Record<string, unknown>;
  renderChildren: (childIds: string[]) => React.ReactNode;
  renderChild: (childId: string) => React.ReactNode;
}

type ComponentRenderer = (
  component: A2UIComponent,
  context: ComponentRenderContext
) => React.ReactNode;

const renderText: ComponentRenderer = (component, { dataModel }) => {
  const text = resolveDynamicString(component.text, dataModel);
  const { variant, color } = component;

  if (variant === 'title') {
    return (
      <EuiTitle size="s">
        <h3>{text}</h3>
      </EuiTitle>
    );
  }
  if (variant === 'caption') {
    return (
      <EuiText size="xs" color={color ?? 'subdued'}>
        <p>{text}</p>
      </EuiText>
    );
  }
  return (
    <EuiText size="s" color={color ?? undefined}>
      <p>{text}</p>
    </EuiText>
  );
};

const renderRow: ComponentRenderer = (component, { renderChildren }) => {
  const childIds = Array.isArray(component.children) ? component.children : [];
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems={(component.align as 'center' | 'flexStart' | 'flexEnd') ?? undefined}
      justifyContent={(component.justify as 'spaceBetween' | 'spaceAround' | 'center') ?? undefined}
      responsive={false}
      wrap
    >
      {renderChildren(childIds)}
    </EuiFlexGroup>
  );
};

const renderColumn: ComponentRenderer = (component, { renderChildren }) => {
  const childIds = Array.isArray(component.children) ? component.children : [];
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems={(component.align as 'center' | 'flexStart' | 'flexEnd') ?? undefined}
    >
      {renderChildren(childIds)}
    </EuiFlexGroup>
  );
};

const renderCard: ComponentRenderer = (component, { dataModel, renderChild }) => {
  const title = component.title ? resolveDynamicString(component.title, dataModel) : undefined;
  return (
    <EuiPanel hasBorder paddingSize="m" color={toPanelColor(component.color)}>
      {title && (
        <>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      )}
      {component.child && renderChild(component.child)}
    </EuiPanel>
  );
};

const renderStat: ComponentRenderer = (component, { dataModel }) => {
  const title = resolveDynamicString(component.title, dataModel);
  const value = resolveDynamicValue(component.value, dataModel) ?? '';
  const description = component.description
    ? resolveDynamicString(component.description, dataModel)
    : undefined;
  const titleColor = component.color ?? undefined;

  return (
    <EuiStat
      title={String(value)}
      description={title}
      titleSize="m"
      titleColor={titleColor}
      css={css`
        .euiStat__title {
          white-space: nowrap;
        }
      `}
    >
      {description && (
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      )}
    </EuiStat>
  );
};

const renderTable: ComponentRenderer = (component, { dataModel }) => {
  const rows = resolveDataPath(component.data_path, dataModel);
  const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = (
    component.columns ?? []
  ).map((col) => ({
    field: col.field,
    name: resolveDynamicString(col.name, dataModel),
    width: col.width,
  }));

  return <EuiBasicTable items={rows} columns={columns} tableCaption="A2UI data table" />;
};

const renderDescriptionList: ComponentRenderer = (component, { dataModel }) => {
  const items = (component.items ?? []).map((item) => ({
    title: resolveDynamicString(item.title, dataModel),
    description: resolveDynamicString(item.description, dataModel),
  }));

  return <EuiDescriptionList listItems={items} type="column" compressed />;
};

const renderButton: ComponentRenderer = (component, { dataModel }) => {
  const text = resolveDynamicString(component.text, dataModel);
  const isPrimary = component.variant === 'primary';

  return (
    <EuiButton size="s" fill={isPrimary} color={toButtonColor(component.color)}>
      {text}
    </EuiButton>
  );
};

const renderDivider: ComponentRenderer = (component) => {
  return (
    <EuiHorizontalRule margin={(component.size as 's' | 'm' | 'l' | 'xl' | 'xxl') ?? 's'} />
  );
};

const renderIcon: ComponentRenderer = (component) => {
  return (
    <EuiIcon
      type={component.name ?? 'empty'}
      color={component.color ?? 'default'}
      size={(component.size as 's' | 'm' | 'l' | 'xl') ?? 'm'}
      aria-hidden={true}
    />
  );
};

const renderBadge: ComponentRenderer = (component, { dataModel }) => {
  const text = resolveDynamicString(component.text, dataModel);
  return <EuiBadge color={component.color ?? 'default'}>{text}</EuiBadge>;
};

const renderVisualizationRef: ComponentRenderer = (component) => {
  return <VisualizationRefRenderer component={component} />;
};

const renderFieldValue: ComponentRenderer = (component, { dataModel }) => {
  const fieldName = resolveDynamicString(component.field_name, dataModel);
  const fieldValue = resolveDynamicString(component.field_value, dataModel);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>{fieldName}:</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{fieldValue}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Map from A2UI component type names to their EUI renderer functions.
 */
export const componentRenderers: Record<string, ComponentRenderer> = {
  [A2UIComponentType.Text]: renderText,
  [A2UIComponentType.Row]: renderRow,
  [A2UIComponentType.Column]: renderColumn,
  [A2UIComponentType.Card]: renderCard,
  [A2UIComponentType.Stat]: renderStat,
  [A2UIComponentType.Table]: renderTable,
  [A2UIComponentType.DescriptionList]: renderDescriptionList,
  [A2UIComponentType.Button]: renderButton,
  [A2UIComponentType.Divider]: renderDivider,
  [A2UIComponentType.Icon]: renderIcon,
  [A2UIComponentType.Badge]: renderBadge,
  [A2UIComponentType.VisualizationRef]: renderVisualizationRef,
  [A2UIComponentType.FieldValue]: renderFieldValue,
};
