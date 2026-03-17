/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSplitPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface BaseFieldGroupProps {
  title: string;
  children: React.ReactNode;
}

type StaticFieldGroupProps = BaseFieldGroupProps & {
  isOpen?: never;
  onToggle?: never;
  defaultOpen?: never;
};

type ControlledCollapsibleFieldGroupProps = BaseFieldGroupProps & {
  isOpen: boolean;
  onToggle: () => void;
  defaultOpen?: never;
};

type UncontrolledCollapsibleFieldGroupProps = BaseFieldGroupProps & {
  defaultOpen?: boolean;
  isOpen?: never;
  onToggle?: never;
};

type FieldGroupProps =
  | StaticFieldGroupProps
  | ControlledCollapsibleFieldGroupProps
  | UncontrolledCollapsibleFieldGroupProps;

const isControlledFieldGroup = (
  props: FieldGroupProps
): props is ControlledCollapsibleFieldGroupProps => {
  return 'isOpen' in props && typeof props.onToggle === 'function';
};

const isUncontrolledFieldGroup = (
  props: FieldGroupProps
): props is UncontrolledCollapsibleFieldGroupProps => {
  return 'defaultOpen' in props;
};

export const FieldGroup = (props: FieldGroupProps) => {
  const { title, children } = props;
  const isControlled = isControlledFieldGroup(props);
  const isUncontrolled = isUncontrolledFieldGroup(props);
  const isCollapsible = isControlled || isUncontrolled;

  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState<boolean>(
    isUncontrolled ? props.defaultOpen ?? false : false
  );

  const isOpen = isControlled ? props.isOpen : isUncontrolled ? uncontrolledIsOpen : true;

  const onToggle = useCallback(() => {
    if (isControlled) {
      props.onToggle();
      return;
    }

    if (isUncontrolled) {
      setUncontrolledIsOpen((prev) => !prev);
    }
  }, [isControlled, isUncontrolled, props]);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {isCollapsible ? (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={isOpen ? 'arrowDown' : 'arrowRight'}
                onClick={onToggle}
                aria-label={i18n.translate(
                  'xpack.alertingV2.ruleForm.fieldGroup.toggleButtonLabel',
                  {
                    defaultMessage: 'Toggle {title}',
                    values: { title },
                  }
                )}
                color="text"
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                <strong>{title}</strong>
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {isOpen ? <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner> : null}
    </EuiSplitPanel.Outer>
  );
};
