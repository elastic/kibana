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
import type { EuiBasicTableColumn } from '@elastic/eui';
import { A2UIComponentType } from '@kbn/agent-builder-common/attachments';
import type { A2UIComponent } from '@kbn/agent-builder-common/attachments';
import { resolveDynamicString, resolveDynamicValue, resolveDataPath } from './data_model';

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
  const { variant } = component;

  if (variant === 'title') {
    return (
      <EuiTitle size="s">
        <h3>{text}</h3>
      </EuiTitle>
    );
  }
  if (variant === 'caption') {
    return (
      <EuiText size="xs" color="subdued">
        <p>{text}</p>
      </EuiText>
    );
  }
  return (
    <EuiText size="s">
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
    <EuiPanel hasBorder paddingSize="m">
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

  return (
    <EuiStat title={String(value)} description={title} titleSize="m">
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
    <EuiButton size="s" fill={isPrimary}>
      {text}
    </EuiButton>
  );
};

const renderDivider: ComponentRenderer = () => {
  return <EuiHorizontalRule margin="s" />;
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
  return (
    <EuiPanel hasBorder paddingSize="m" color="subdued">
      <EuiText size="xs" color="subdued">
        <EuiIcon type="lensApp" size="s" aria-hidden={true} /> Visualization:{' '}
        {component.attachment_id ?? 'unknown'}
        {component.version !== undefined ? ` (v${component.version})` : ''}
      </EuiText>
    </EuiPanel>
  );
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
