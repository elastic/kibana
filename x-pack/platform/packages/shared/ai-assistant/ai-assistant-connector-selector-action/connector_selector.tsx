/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopoverFooter,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { translations as i8n } from './connector_selector.translations';

/** Props for the `ConnectorSelector` */
export interface ConnectorSelectorProps<T extends { value: string } = { value: string }> {
  /** Pre-configured connectors to display in the selector */
  preConfiguredConnectors: (EuiSelectableLIOption<T> & { key?: undefined; checked?: undefined })[];
  /** Custom connectors to display in the selector */
  customConnectors: (EuiSelectableLIOption<T> & { key?: undefined; checked?: undefined })[];
  /** Default connector id if a default connector has been configured. */
  defaultConnectorId?: string;
  /** Optional test subject for the component. */
  ['data-test-subj']?: string;
  /** Controlled selected connector value. */
  value?: string;
  /** Uncontrolled initial selected connector value. */
  defaultValue?: string;
  /** Callback that provides the selected connector value (string). */
  onValueChange?: (value: string, option: EuiSelectableOption<T>) => void;
  /** Label for the "Add Connector" button. Default is "Add Connector" */
  addConnectorLabel?: string;
  /** Aria label for the "Add Connector" button. Default is "Add Connector" */
  addConnectorAriaLabel?: string;
  /** Aria label for the "Manage Connectors" button. Default is "Manage Connector" */
  manageConnectorAriaLabel?: string;
  /** Callback when the "Add Connector" button is clicked */
  onAddConnectorClick?: () => void;
  /** Callback when the "Manage Connectors" button is clicked */
  onManageConnectorsClick?: () => void;
}

export const ConnectorSelector = <T extends { value: string } = { value: string }>(
  props: ConnectorSelectorProps<T>
) => {
  const {
    addConnectorLabel = i8n.addConnectorLabel,
    addConnectorAriaLabel = i8n.addConnectorAriaLabel,
    manageConnectorAriaLabel = i8n.manageConnectorAriaLabel,
  } = props;

  // Determine controlled vs uncontrolled
  const isControlled = Object.prototype.hasOwnProperty.call(props, 'value');
  const controlledValue = props.value ?? undefined;

  // Internal value only used when uncontrolled
  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(() => {
    if (props.defaultValue !== undefined) return props.defaultValue;
    return undefined;
  });

  const selectedValue = isControlled ? controlledValue : uncontrolledValue;

  const defaultConnectorBadge = useMemo(() => {
    return (
      <EuiBadge color="hollow" data-test-subj="defaultConnectorBadge">
        {i8n.defaultConnectorLabel}
      </EuiBadge>
    );
  }, []);

  const preConfiguredConnectors = useMemo(
    () =>
      props.preConfiguredConnectors.map((connector) => ({
        ...connector,
        key: connector.value,
        checked: connector.value === selectedValue ? 'on' : undefined,
        append: connector.value === props.defaultConnectorId ? defaultConnectorBadge : undefined,
      })),
    [props.preConfiguredConnectors, selectedValue, props.defaultConnectorId, defaultConnectorBadge]
  );

  const customConnectors = useMemo(
    () =>
      props.customConnectors.map((connector) => ({
        ...connector,
        key: connector.value,
        checked: connector.value === selectedValue ? 'on' : undefined,
        append: connector.value === props.defaultConnectorId ? defaultConnectorBadge : undefined,
      })),
    [props.customConnectors, selectedValue, props.defaultConnectorId, defaultConnectorBadge]
  );

  const options = useMemo<EuiSelectableOption<T>[]>(
    () => [
      ...(preConfiguredConnectors.length > 0
        ? [
            {
              label: i8n.preConfiguredConnectorLabel,
              isGroupLabel: true,
              value: 'preConfiguredLabel',
            } as EuiSelectableOption<T>,
          ]
        : []),
      ...preConfiguredConnectors,
      ...(customConnectors.length > 0
        ? ([
            { label: i8n.customConnectorLabel, isGroupLabel: true, value: 'customLabel' },
          ] as EuiSelectableOption<T>[])
        : []),
      ...customConnectors,
    ],
    [preConfiguredConnectors, customConnectors]
  );

  const handleChange = (newOptions: EuiSelectableOption<T>[]) => {
    const selectedOption = newOptions.find((option) => option.checked === 'on');
    if (!selectedOption) return;

    if (!isControlled) {
      setUncontrolledValue(String(selectedOption.value));
    }

    props.onValueChange?.(String(selectedOption.value), selectedOption);
  };

  return (
    <EuiPanel
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      grow={false}
      data-test-subj={props['data-test-subj'] ?? 'aiAssistantConnectorSelector'}
    >
      <EuiSelectable
        aria-label={i8n.selectableAriaLabel}
        singleSelection
        options={options}
        onChange={handleChange}
      >
        {(list) => (
          <>
            {list}
            {(props.onAddConnectorClick || props.onManageConnectorsClick) && (
              <EuiPopoverFooter paddingSize="s">
                <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
                  {props.onAddConnectorClick && (
                    <EuiFlexItem grow={true}>
                      <EuiButton
                        size="s"
                        fullWidth
                        onClick={props.onAddConnectorClick}
                        aria-label={addConnectorAriaLabel}
                        data-test-subj="aiAssistantAddConnectorButton"
                      >
                        <EuiIcon type="plus" />
                        {addConnectorLabel}
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  {props.onManageConnectorsClick && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="aiAssistantManageConnectorsButton"
                        size="s"
                        display="base"
                        iconType={'gear'}
                        onClick={props.onManageConnectorsClick}
                        aria-label={manageConnectorAriaLabel}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPopoverFooter>
            )}
          </>
        )}
      </EuiSelectable>
    </EuiPanel>
  );
};
