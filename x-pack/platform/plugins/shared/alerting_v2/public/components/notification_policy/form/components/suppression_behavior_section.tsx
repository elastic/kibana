/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
} from '@elastic/eui';
import type { DropResult } from '@elastic/eui';
import type { ControllerRenderProps } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { NotificationPolicyFormState, SuppressionMechanismItem } from '../types';

const mechanismLabel = (id: SuppressionMechanismItem['id']): string => {
  switch (id) {
    case 'maintenance_window':
      return i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.suppression.maintenanceWindow',
        { defaultMessage: 'Respect maintenance window' }
      );
    case 'manual_suppressions':
      return i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.suppression.manualSuppressions',
        { defaultMessage: 'Respect manual suppressions' }
      );
    default:
      return id;
  }
};

const mechanismSwitchLabel = (order: number, id: SuppressionMechanismItem['id']): string =>
  i18n.translate('xpack.alertingV2.notificationPolicy.form.suppression.mechanismOrderedLabel', {
    defaultMessage: '{order}. {label}',
    values: { order, label: mechanismLabel(id) },
  });

const SuppressionMechanismsList = ({
  field,
}: {
  field: ControllerRenderProps<NotificationPolicyFormState, 'suppressionMechanisms'>;
}) => {
  const items = field.value;

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!destination || destination.index === source.index) {
        return;
      }
      field.onChange(euiDragDropReorder(items, source.index, destination.index));
    },
    [field, items]
  );

  const toggleMechanism = useCallback(
    (id: SuppressionMechanismItem['id'], enabled: boolean) => {
      field.onChange(items.map((m) => (m.id === id ? { ...m, enabled } : m)));
    },
    [field, items]
  );

  return (
    <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.suppression.title"
              defaultMessage="Suppression behavior"
            />
          </h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.suppression.description"
            defaultMessage="Configure how this policy is evaluated and interacts with other suppression mechanisms. Options are evaluated in list order from top to bottom."
          />
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="notificationPolicySuppressionMechanisms">
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 ? <EuiSpacer size="s" /> : null}
                <EuiDraggable
                  index={index}
                  draggableId={item.id}
                  customDragHandle
                  hasInteractiveChildren
                  spacing="none"
                >
                  {(provided) => (
                    <EuiPanel
                      paddingSize="m"
                      hasBorder
                      grow={false}
                      data-test-subj={`suppressionMechanism-${item.id}`}
                    >
                      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiPanel
                            color="transparent"
                            paddingSize="none"
                            {...provided.dragHandleProps}
                            aria-label={i18n.translate(
                              'xpack.alertingV2.notificationPolicy.form.suppression.dragHandle',
                              { defaultMessage: 'Drag handle' }
                            )}
                          >
                            <EuiIcon type="grab" color="subdued" />
                          </EuiPanel>
                        </EuiFlexItem>
                        <EuiFlexItem grow={true}>
                          <EuiSwitch
                            id={`suppression-${item.id}`}
                            label={mechanismSwitchLabel(index + 1, item.id)}
                            checked={item.enabled}
                            compressed
                            onChange={(e) => toggleMechanism(item.id, e.target.checked)}
                            data-test-subj={`suppressionSwitch-${item.id}`}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  )}
                </EuiDraggable>
              </React.Fragment>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

export const SuppressionBehaviorSection = () => {
  const { control } = useFormContext<NotificationPolicyFormState>();

  return (
    <Controller
      name="suppressionMechanisms"
      control={control}
      render={({ field }) => <SuppressionMechanismsList field={field} />}
    />
  );
};
