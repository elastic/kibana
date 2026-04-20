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
  EuiFieldText,
  EuiFieldPassword,
  EuiTextArea,
  EuiSelect,
  EuiComboBox,
  EuiSwitch,
  EuiFormRow,
  EuiProgress,
  EuiTimeline,
  EuiCallOut,
  EuiAccordion,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn, EuiButtonProps } from '@elastic/eui';
import type { PanelColor } from '@elastic/eui/src/components/panel/panel';
import { A2UIComponentType } from '@kbn/agent-builder-common/attachments';
import type { A2UIComponent, A2UIAction } from '@kbn/agent-builder-common/attachments';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { resolveDynamicString, resolveDynamicValue, resolveDataPath } from './data_model';
import { VisualizationRefRenderer } from './visualization_ref';
import type { SurfaceFormState } from './use_surface_form_state';

const PANEL_COLORS: ReadonlySet<string> = new Set([
  'transparent',
  'plain',
  'subdued',
  'highlighted',
  'accent',
  'accentSecondary',
  'primary',
  'success',
  'warning',
  'danger',
  'neutral',
  'risk',
]);

const BUTTON_COLORS: ReadonlySet<string> = new Set([
  'text',
  'accent',
  'accentSecondary',
  'primary',
  'success',
  'warning',
  'danger',
]);

const CALLOUT_COLORS: ReadonlySet<string> = new Set([
  'primary',
  'success',
  'warning',
  'danger',
  'accent',
]);

type CalloutColor = 'primary' | 'success' | 'warning' | 'danger' | 'accent';

const toCalloutColor = (color: string | undefined): CalloutColor | undefined =>
  color !== undefined && CALLOUT_COLORS.has(color) ? (color as CalloutColor) : undefined;

const toPanelColor = (color: string | undefined): PanelColor | undefined =>
  color !== undefined && PANEL_COLORS.has(color) ? (color as PanelColor) : undefined;

const toButtonColor = (color: string | undefined): EuiButtonProps['color'] =>
  color !== undefined && BUTTON_COLORS.has(color) ? (color as EuiButtonProps['color']) : undefined;

export interface SurfaceActionPayload {
  action: A2UIAction;
  formData: Record<string, string | number | boolean>;
  surfaceId: string;
}

export interface ComponentRenderContext {
  dataModel: Record<string, unknown>;
  renderChildren: (childIds: string[]) => React.ReactNode;
  renderChild: (childId: string) => React.ReactNode;
  onSurfaceAction?: (payload: SurfaceActionPayload) => void;
  formState?: SurfaceFormState;
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

const rowContainerStyles = css`
  container-type: inline-size;
`;

const rowFlexStyles = css`
  @container (max-width: 500px) {
    flex-direction: column;
  }
`;

const renderRow: ComponentRenderer = (component, { renderChildren }) => {
  const childIds = Array.isArray(component.children) ? component.children : [];
  return (
    <div css={rowContainerStyles}>
      <EuiFlexGroup
        gutterSize="m"
        alignItems={(component.align as 'center' | 'flexStart' | 'flexEnd') ?? undefined}
        justifyContent={
          (component.justify as 'spaceBetween' | 'spaceAround' | 'center') ?? undefined
        }
        responsive={false}
        wrap
        css={rowFlexStyles}
      >
        {renderChildren(childIds)}
      </EuiFlexGroup>
    </div>
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

const tableScrollStyles = css`
  overflow-x: auto;
`;

const renderTable: ComponentRenderer = (component, { dataModel }) => {
  const rows = resolveDataPath(component.data_path, dataModel);
  const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = (
    component.columns ?? []
  ).map((col) => ({
    field: col.field,
    name: resolveDynamicString(col.name, dataModel),
    width: col.width,
  }));

  return (
    <div css={tableScrollStyles}>
      <EuiBasicTable items={rows} columns={columns} tableCaption="A2UI data table" />
    </div>
  );
};

const renderDescriptionList: ComponentRenderer = (component, { dataModel }) => {
  const items = (component.items ?? []).map((item) => ({
    title: resolveDynamicString(item.title, dataModel),
    description: resolveDynamicString(item.description, dataModel),
  }));

  return <EuiDescriptionList listItems={items} type="column" compressed />;
};

const renderButton: ComponentRenderer = (component, { dataModel, onSurfaceAction, formState }) => {
  const text = resolveDynamicString(component.text, dataModel);
  const isPrimary = component.variant === 'primary';

  const handleClick = () => {
    if (component.action && onSurfaceAction) {
      onSurfaceAction({
        action: component.action,
        formData: formState?.getFormData() ?? {},
        surfaceId: '',
      });
    }
  };

  return (
    <EuiButton
      size="s"
      fill={isPrimary}
      color={toButtonColor(component.color)}
      onClick={component.action ? handleClick : undefined}
    >
      {text}
    </EuiButton>
  );
};

const renderDivider: ComponentRenderer = (component) => {
  return <EuiHorizontalRule margin={(component.size as 's' | 'm' | 'l' | 'xl' | 'xxl') ?? 's'} />;
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

const SECRET_FIELD_PATTERN =
  /(?:^|[_-])(?:token|secret|password|api[_-]?key|credential|private[_-]?key)(?:[_-]|$)/i;

const isSecretField = (component: A2UIComponent, fieldId: string): boolean => {
  if (component.variant === 'password') return true;
  return SECRET_FIELD_PATTERN.test(fieldId);
};

const renderTextInput: ComponentRenderer = (component, { dataModel, formState }) => {
  const label = component.label ? resolveDynamicString(component.label, dataModel) : undefined;
  const fieldId = component.field_id ?? component.id;
  const cachedValue = formState?.getFieldValue(fieldId);
  const defaultVal =
    cachedValue !== undefined
      ? String(cachedValue)
      : component.default_value
      ? String(resolveDynamicValue(component.default_value, dataModel) ?? '')
      : '';

  const secret = isSecretField(component, fieldId);

  const field = secret ? (
    <EuiFieldPassword
      placeholder={component.placeholder ?? ''}
      defaultValue={defaultVal}
      onChange={(e) => formState?.setFieldValue(fieldId, e.target.value)}
      type="dual"
      fullWidth
    />
  ) : (
    <EuiFieldText
      placeholder={component.placeholder ?? ''}
      defaultValue={defaultVal}
      onChange={(e) => formState?.setFieldValue(fieldId, e.target.value)}
      fullWidth
    />
  );

  return label ? (
    <EuiFormRow label={label} fullWidth>
      {field}
    </EuiFormRow>
  ) : (
    field
  );
};

const renderTextArea: ComponentRenderer = (component, { dataModel, formState }) => {
  const label = component.label ? resolveDynamicString(component.label, dataModel) : undefined;
  const fieldId = component.field_id ?? component.id;
  const cachedValue = formState?.getFieldValue(fieldId);
  const defaultVal =
    cachedValue !== undefined
      ? String(cachedValue)
      : component.default_value
      ? String(resolveDynamicValue(component.default_value, dataModel) ?? '')
      : '';

  const field = (
    <EuiTextArea
      placeholder={component.placeholder ?? ''}
      defaultValue={defaultVal}
      rows={component.rows ?? 3}
      onChange={(e) => formState?.setFieldValue(fieldId, e.target.value)}
      fullWidth
    />
  );

  return label ? (
    <EuiFormRow label={label} fullWidth>
      {field}
    </EuiFormRow>
  ) : (
    field
  );
};

const SelectRenderer: React.FC<{
  component: A2UIComponent;
  dataModel: Record<string, unknown>;
  formState?: SurfaceFormState;
}> = ({ component, dataModel, formState }) => {
  const label = component.label ? resolveDynamicString(component.label, dataModel) : undefined;
  const fieldId = component.field_id ?? component.id;
  const options = (component.options ?? []).map((opt) => ({
    value: opt.value,
    text: opt.label,
  }));
  const defaultVal = component.default_value
    ? String(resolveDynamicValue(component.default_value, dataModel) ?? '')
    : undefined;
  const cachedValue = formState?.getFieldValue(fieldId);
  const initialValue =
    cachedValue !== undefined ? String(cachedValue) : defaultVal ?? options[0]?.value ?? '';
  const [value, setValue] = React.useState(initialValue);

  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      formState?.setReactiveFieldValue(fieldId, initialValue);
    }
  }, [formState, fieldId, initialValue]);

  const field = (
    <EuiSelect
      options={options}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        formState?.setReactiveFieldValue(fieldId, e.target.value);
      }}
      fullWidth
      aria-label={label ?? fieldId}
    />
  );

  return label ? (
    <EuiFormRow label={label} fullWidth>
      {field}
    </EuiFormRow>
  ) : (
    field
  );
};

const renderSelect: ComponentRenderer = (component, { dataModel, formState }) => {
  return <SelectRenderer component={component} dataModel={dataModel} formState={formState} />;
};

const resolveOptionIcon = (value: string, iconHint?: string): React.ReactNode | undefined => {
  const ConnectorIcon = ConnectorIconsMap.get(value);
  if (ConnectorIcon) {
    return (
      <React.Suspense fallback={<EuiIcon type="empty" size="s" aria-hidden={true} />}>
        <ConnectorIcon size="s" aria-hidden={true} />
      </React.Suspense>
    );
  }
  if (iconHint) {
    return <EuiIcon type={iconHint} size="s" aria-hidden={true} />;
  }
  return undefined;
};

const ComboBoxRenderer: React.FC<{
  component: A2UIComponent;
  dataModel: Record<string, unknown>;
  formState?: SurfaceFormState;
}> = ({ component, dataModel, formState }) => {
  const label = component.label ? resolveDynamicString(component.label, dataModel) : undefined;
  const fieldId = component.field_id ?? component.id;
  const comboOptions = (component.options ?? []).map((opt) => {
    const prepend = resolveOptionIcon(opt.value, opt.icon);
    return {
      label: opt.label,
      value: opt.value,
      ...(prepend ? { prepend } : {}),
    };
  });

  const defaultVal = component.default_value
    ? String(resolveDynamicValue(component.default_value, dataModel) ?? '')
    : undefined;

  const cachedValue = formState?.getFieldValue(fieldId);
  const resolvedDefault = cachedValue !== undefined ? String(cachedValue) : defaultVal;
  const initialSelected = resolvedDefault
    ? comboOptions.filter((opt) => opt.value === resolvedDefault)
    : [];

  const [selectedOptions, setSelectedOptions] =
    React.useState<Array<{ label: string; value: string; prepend?: React.ReactNode }>>(
      initialSelected
    );

  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (!seededRef.current && resolvedDefault) {
      seededRef.current = true;
      formState?.setReactiveFieldValue(fieldId, resolvedDefault);
    }
  }, [formState, fieldId, resolvedDefault]);

  const onChange = (opts: Array<{ label: string; value?: string; prepend?: React.ReactNode }>) => {
    setSelectedOptions(
      opts.map((o) => ({
        label: o.label,
        value: o.value ?? o.label,
        ...(o.prepend ? { prepend: o.prepend } : {}),
      }))
    );
    const val = opts.length > 0 ? opts[0].value ?? opts[0].label : '';
    formState?.setReactiveFieldValue(fieldId, val);
  };

  const field = (
    <EuiComboBox
      aria-label={label ?? fieldId}
      placeholder={component.placeholder ?? 'Select an option'}
      singleSelection={{ asPlainText: true }}
      options={comboOptions}
      selectedOptions={selectedOptions}
      onChange={onChange}
      fullWidth
    />
  );

  return label ? (
    <EuiFormRow label={label} fullWidth>
      {field}
    </EuiFormRow>
  ) : (
    field
  );
};

const renderComboBox: ComponentRenderer = (component, { dataModel, formState }) => {
  return <ComboBoxRenderer component={component} dataModel={dataModel} formState={formState} />;
};

const SwitchRenderer: React.FC<{
  component: A2UIComponent;
  dataModel: Record<string, unknown>;
  formState?: SurfaceFormState;
}> = ({ component, dataModel, formState }) => {
  const label = component.label ? resolveDynamicString(component.label, dataModel) : '';
  const fieldId = component.field_id ?? component.id;
  const cachedValue = formState?.getFieldValue(fieldId);
  const [checked, setChecked] = React.useState(
    cachedValue !== undefined ? cachedValue === true : component.default_value === true
  );

  return (
    <EuiSwitch
      label={label}
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        formState?.setReactiveFieldValue(fieldId, e.target.checked);
      }}
    />
  );
};

const renderSwitch: ComponentRenderer = (component, { dataModel, formState }) => {
  return <SwitchRenderer component={component} dataModel={dataModel} formState={formState} />;
};

const renderFormGroup: ComponentRenderer = (component, { dataModel, renderChildren }) => {
  const title = component.title ? resolveDynamicString(component.title, dataModel) : undefined;
  const description = component.description
    ? resolveDynamicString(component.description, dataModel)
    : undefined;
  const childIds = Array.isArray(component.children) ? component.children : [];

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      {title && (
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      )}
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}
      {(title || description) && <EuiSpacer size="m" />}
      <EuiFlexGroup direction="column" gutterSize="m">
        {renderChildren(childIds)}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const renderProgress: ComponentRenderer = (component, { dataModel }) => {
  const value = Number(resolveDynamicValue(component.value, dataModel) ?? 0);
  const max = component.max ?? 100;
  const label = component.label ? resolveDynamicString(component.label, dataModel) : undefined;

  return (
    <>
      {label && (
        <EuiText size="xs" color="subdued">
          <p>{label}</p>
        </EuiText>
      )}
      <EuiProgress
        value={value}
        max={max}
        size="m"
        color={component.color ?? 'primary'}
        label={label}
        valueText={`${Math.round((value / max) * 100)}%`}
      />
    </>
  );
};

const renderTimeline: ComponentRenderer = (component, { dataModel }) => {
  const items = (component.timeline_items ?? []).map((item) => ({
    icon: item.icon ?? 'dot',
    children: (
      <>
        <EuiText size="s">
          <strong>{resolveDynamicString(item.title, dataModel)}</strong>
        </EuiText>
        {item.description && (
          <EuiText size="xs" color="subdued">
            {resolveDynamicString(item.description, dataModel)}
          </EuiText>
        )}
      </>
    ),
  }));

  return <EuiTimeline items={items} />;
};

const CALLOUT_COLOR_ICONS: Readonly<Record<CalloutColor, string>> = {
  primary: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'error',
  accent: 'sparkles',
};

const renderCallout: ComponentRenderer = (component, { dataModel, renderChildren }) => {
  const title = component.heading ? resolveDynamicString(component.heading, dataModel) : undefined;
  const childIds = Array.isArray(component.children) ? component.children : [];
  const color = toCalloutColor(component.color) ?? 'primary';

  return (
    <EuiCallOut
      title={title}
      color={color}
      iconType={CALLOUT_COLOR_ICONS[color]}
    >
      {component.text && (
        <EuiText size="s">
          <p>{resolveDynamicString(component.text, dataModel)}</p>
        </EuiText>
      )}
      {childIds.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {renderChildren(childIds)}
        </EuiFlexGroup>
      )}
    </EuiCallOut>
  );
};

const renderAccordion: ComponentRenderer = (component, { dataModel, renderChild }) => {
  const title = component.title ? resolveDynamicString(component.title, dataModel) : 'Details';

  return (
    <EuiAccordion
      id={component.id}
      buttonContent={title}
      initialIsOpen={component.initially_open ?? false}
    >
      <EuiSpacer size="s" />
      {component.child && renderChild(component.child)}
      {Array.isArray(component.children) && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {component.children.map((childId) => (
            <EuiFlexItem key={childId}>{renderChild(childId)}</EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiAccordion>
  );
};

const STEP_STATUSES: ReadonlySet<string> = new Set([
  'incomplete',
  'disabled',
  'loading',
  'warning',
  'danger',
  'complete',
  'current',
]);

type StepStatus =
  | 'incomplete'
  | 'disabled'
  | 'loading'
  | 'warning'
  | 'danger'
  | 'complete'
  | 'current';

const toStepStatus = (status: string | undefined): StepStatus =>
  status !== undefined && STEP_STATUSES.has(status) ? (status as StepStatus) : 'incomplete';

const noop = () => {};

const renderStepsHeader: ComponentRenderer = (component) => {
  const steps = (component.steps ?? []).map((s) => ({
    title: s.title,
    status: toStepStatus(s.status),
    onClick: noop,
  }));

  return (
    <div
      css={css`
        pointer-events: none;
        & ol {
          list-style: none !important;
          counter-reset: none !important;
          margin: 0 !important;
          margin-inline: 0 !important;
          padding: 0 !important;
          padding-inline: 0 !important;
        }
        & ol > li {
          counter-increment: none !important;
          list-style: none !important;
          margin-block: 0 !important;
        }
      `}
      role="presentation"
      // @ts-expect-error React 18 does not type the inert attribute natively
      inert=""
    >
      <EuiStepsHorizontal steps={steps} size="s" />
    </div>
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
  [A2UIComponentType.TextInput]: renderTextInput,
  [A2UIComponentType.TextArea]: renderTextArea,
  [A2UIComponentType.Select]: renderSelect,
  [A2UIComponentType.ComboBox]: renderComboBox,
  [A2UIComponentType.Switch]: renderSwitch,
  [A2UIComponentType.FormGroup]: renderFormGroup,
  [A2UIComponentType.Progress]: renderProgress,
  [A2UIComponentType.Timeline]: renderTimeline,
  [A2UIComponentType.Callout]: renderCallout,
  [A2UIComponentType.Accordion]: renderAccordion,
  [A2UIComponentType.StepsHeader]: renderStepsHeader,
};
