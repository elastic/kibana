/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, type ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiTitle,
  EuiSplitPanel,
  useGeneratedHtmlId,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRuleFormMeta } from '../contexts';

interface BaseFieldGroupProps {
  title: string;
  /** Optional content aligned to the right of the title row (page layout only). */
  titleRight?: ReactNode;
  /** Optional badge next to the title (e.g. builder / ES|QL mode). */
  titleBadge?: ReactNode;
  /** Sets `id` on the section root for in-page anchors. */
  sectionDomId?: string;
  /** Optional icon before the title (page and flyout layouts). */
  titleLeadingIconType?: IconType;
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
  const { title, titleRight, titleBadge, sectionDomId, titleLeadingIconType, children } = props;
  const { layout } = useRuleFormMeta();
  const id = useGeneratedHtmlId({ prefix: 'fieldGroup' });
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

  if (layout === 'flyout') {
    const accordionProps = isControlled
      ? {
          forceState: props.isOpen ? ('open' as const) : ('closed' as const),
          onToggle: () => props.onToggle(),
        }
      : isUncontrolled
      ? { initialIsOpen: props.defaultOpen ?? false }
      : { initialIsOpen: true };

    return (
      <>
        <EuiAccordion
          id={sectionDomId ?? id}
          buttonContent={
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  {titleLeadingIconType ? (
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={titleLeadingIconType} size="m" aria-hidden={true} />
                    </EuiFlexItem>
                  ) : null}
                  <EuiTitle size="xxs">
                    <h3>
                      <strong>{title}</strong>
                    </h3>
                  </EuiTitle>
                  {titleBadge ?? null}
                </EuiFlexGroup>
              </EuiFlexItem>
              {titleRight ? (
                <EuiFlexItem grow={false}>
                  <div style={{ marginInlineEnd: 8 }}>{titleRight}</div>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
          paddingSize="s"
          {...accordionProps}
        >
          {children}
        </EuiAccordion>
        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="xs" />
      </>
    );
  }

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true} id={sectionDomId}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="s">
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={true}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
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
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  {titleLeadingIconType ? (
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={titleLeadingIconType} size="m" aria-hidden={true} />
                    </EuiFlexItem>
                  ) : null}
                  <EuiTitle size="xxs">
                    <h3>
                      <strong>{title}</strong>
                    </h3>
                  </EuiTitle>
                  {titleBadge ?? null}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {titleRight ? (
            <EuiFlexItem grow={false}>
              <div style={{ flexShrink: 0 }}>{titleRight}</div>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {isOpen ? <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner> : null}
    </EuiSplitPanel.Outer>
  );
};
