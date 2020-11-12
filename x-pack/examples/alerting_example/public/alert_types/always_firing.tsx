/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopover,
  EuiExpression,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit, pick } from 'lodash';
import {
  ActionGroupWithCondition,
  AlertConditions,
  AlertConditionsGroup,
  AlertTypeModel,
  AlertTypeParamsExpressionProps,
  AlertsContextValue,
} from '../../../../plugins/triggers_actions_ui/public';
import {
  AlwaysFiringParams,
  AlwaysFiringActionGroupIds,
  DEFAULT_INSTANCES_TO_GENERATE,
} from '../../common/constants';

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example.always-firing',
    name: 'Always Fires',
    description: 'Alert when called',
    iconClass: 'bolt',
    documentationUrl: null,
    alertParamsExpression: AlwaysFiringExpression,
    validate: (alertParams: AlwaysFiringParams) => {
      const { instances } = alertParams;
      const validationResult = {
        errors: {
          instances: new Array<string>(),
        },
      };
      if (instances && instances < 0) {
        validationResult.errors.instances.push(
          i18n.translate('AlertingExample.addAlert.error.invalidRandomInstances', {
            defaultMessage: 'instances must be equal or greater than zero.',
          })
        );
      }
      return validationResult;
    },
    requiresAppContext: false,
  };
}

const DEFAULT_THRESHOLDS: AlwaysFiringParams['thresholds'] = {
  small: 0,
  medium: 5000,
  large: 10000,
};

export const AlwaysFiringExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  AlwaysFiringParams,
  AlertsContextValue
>> = ({ alertParams, setAlertParams, actionGroups, defaultActionGroupId }) => {
  const {
    instances = DEFAULT_INSTANCES_TO_GENERATE,
    thresholds = pick(DEFAULT_THRESHOLDS, defaultActionGroupId),
  } = alertParams;

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label="Random Instances to generate"
            helpText="How many randomly generated Alert Instances do you wish to activate on each alert run?"
          >
            <EuiFieldNumber
              name="instances"
              value={instances}
              onChange={(event) => {
                setAlertParams('instances', event.target.valueAsNumber);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <AlertConditions
            headline={'Set different thresholds for randomly generated T-Shirt sizes'}
            actionGroups={actionGroups.map((actionGroup) =>
              Number.isInteger(thresholds[actionGroup.id as AlwaysFiringActionGroupIds])
                ? {
                    ...actionGroup,
                    conditions: thresholds[actionGroup.id as AlwaysFiringActionGroupIds]!,
                  }
                : actionGroup
            )}
            onInitializeConditionsFor={(actionGroup) => {
              setAlertParams('thresholds', {
                ...thresholds,
                ...pick(DEFAULT_THRESHOLDS, actionGroup.id),
              });
            }}
          >
            <AlertConditionsGroup
              onResetConditionsFor={(actionGroup) => {
                setAlertParams('thresholds', omit(thresholds, actionGroup.id));
              }}
            >
              <TShirtSelector
                setTShirtThreshold={(actionGroup) => {
                  setAlertParams('thresholds', {
                    ...thresholds,
                    [actionGroup.id]: actionGroup.conditions,
                  });
                }}
              />
            </AlertConditionsGroup>
          </AlertConditions>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );
};

interface TShirtSelectorProps {
  actionGroup?: ActionGroupWithCondition<number>;
  setTShirtThreshold: (actionGroup: ActionGroupWithCondition<number>) => void;
}
const TShirtSelector = ({ actionGroup, setTShirtThreshold }: TShirtSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!actionGroup) {
    return null;
  }

  return (
    <EuiPopover
      panelPaddingSize="s"
      button={
        <EuiExpression
          description={'Is Above'}
          value={actionGroup.conditions}
          isActive={isOpen}
          onClick={() => setIsOpen(true)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      ownFocus
      anchorPosition="downLeft"
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ width: 150 }}>
          {'Is Above'}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFieldNumber
            compressed
            value={actionGroup.conditions}
            onChange={(e) => {
              const conditions = parseInt(e.target.value, 10);
              if (e.target.value && !isNaN(conditions)) {
                setTShirtThreshold({
                  ...actionGroup,
                  conditions,
                });
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
