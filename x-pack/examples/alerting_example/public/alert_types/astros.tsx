/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiFieldNumber,
  EuiPopoverTitle,
  EuiSelect,
  EuiCallOut,
  EuiExpression,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { flatten } from 'lodash';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTING_EXAMPLE_APP_ID, Craft, Operator } from '../../common/constants';

export function registerNavigation(alerting: AlertingSetup) {
  alerting.registerNavigation(
    ALERTING_EXAMPLE_APP_ID,
    'example.people-in-space',
    (rule: SanitizedRule) => `/astros/${rule.id}`
  );
}

interface PeopleinSpaceParamsProps {
  ruleParams: { outerSpaceCapacity?: number; craft?: string; op?: string };
  setRuleParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

function isValueInEnum(enumeratin: Record<string, any>, value: any): boolean {
  return !!Object.values(enumeratin).find((enumVal) => enumVal === value);
}

export function getAlertType(): RuleTypeModel {
  return {
    id: 'example.people-in-space',
    description: 'Alert when people are in space right now',
    iconClass: 'globe',
    documentationUrl: null,
    ruleParamsExpression: PeopleinSpaceExpression,
    validate: (ruleParams: PeopleinSpaceParamsProps['ruleParams']) => {
      const { outerSpaceCapacity, craft, op } = ruleParams;

      const validationResult = {
        errors: {
          outerSpaceCapacity: new Array<string>(),
          craft: new Array<string>(),
        },
      };
      if (!isValueInEnum(Craft, craft)) {
        validationResult.errors.craft.push(
          i18n.translate('AlertingExample.addAlert.error.invalidCraft', {
            defaultMessage: 'You must choose one of the following Craft: {crafts}',
            values: {
              crafts: Object.values(Craft).join(', '),
            },
          })
        );
      }
      if (!(typeof outerSpaceCapacity === 'number' && outerSpaceCapacity >= 0)) {
        validationResult.errors.outerSpaceCapacity.push(
          i18n.translate('AlertingExample.addAlert.error.invalidOuterSpaceCapacity', {
            defaultMessage: 'outerSpaceCapacity must be a number greater than or equal to zero.',
          })
        );
      }
      if (!isValueInEnum(Operator, op)) {
        validationResult.errors.outerSpaceCapacity.push(
          i18n.translate('AlertingExample.addAlert.error.invalidCraft', {
            defaultMessage: 'You must choose one of the following Operator: {crafts}',
            values: {
              crafts: Object.values(Operator).join(', '),
            },
          })
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
  };
}

export const PeopleinSpaceExpression: React.FunctionComponent<PeopleinSpaceParamsProps> = ({
  ruleParams,
  setRuleParams,
  errors,
}) => {
  const { outerSpaceCapacity = 0, craft = Craft.OuterSpace, op = Operator.AreAbove } = ruleParams;

  // store defaults
  useEffect(() => {
    if (outerSpaceCapacity !== ruleParams.outerSpaceCapacity) {
      setRuleParams('outerSpaceCapacity', outerSpaceCapacity);
    }
    if (craft !== ruleParams.craft) {
      setRuleParams('craft', craft);
    }
    if (op !== ruleParams.op) {
      setRuleParams('op', op);
    }
  }, [ruleParams, craft, op, outerSpaceCapacity, setRuleParams]);

  const [craftTrigger, setCraftTrigger] = useState<{ craft: string; isOpen: boolean }>({
    craft,
    isOpen: false,
  });
  const [outerSpaceCapacityTrigger, setOuterSpaceCapacity] = useState<{
    outerSpaceCapacity: number;
    op: string;
    isOpen: boolean;
  }>({
    outerSpaceCapacity,
    op,
    isOpen: false,
  });

  const errorsCallout = flatten(
    Object.entries(errors).map(([field, errs]: [string, string[]], fieldIndex) =>
      errs.map((e, index) => (
        <p key={`astros-error-${fieldIndex}-${index}`}>
          <EuiTextColor color="accent">{field}:</EuiTextColor>`: ${errs}`
        </p>
      ))
    )
  );

  return (
    <Fragment>
      {errorsCallout.length ? (
        <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
          {errorsCallout}
        </EuiCallOut>
      ) : (
        <Fragment />
      )}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="craft"
            button={
              <EuiExpression
                description="When the People in"
                value={craftTrigger.craft}
                isActive={craftTrigger.isOpen}
                onClick={() => {
                  setCraftTrigger({
                    ...craftTrigger,
                    isOpen: true,
                  });
                }}
              />
            }
            isOpen={craftTrigger.isOpen}
            closePopover={() => {
              setCraftTrigger({
                ...craftTrigger,
                isOpen: false,
              });
            }}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div style={{ zIndex: 200 }}>
              <EuiPopoverTitle>When the People in</EuiPopoverTitle>
              <EuiSelect
                compressed
                value={craftTrigger.craft}
                onChange={(event) => {
                  setRuleParams('craft', event.target.value);
                  setCraftTrigger({
                    craft: event.target.value,
                    isOpen: false,
                  });
                }}
                options={[
                  { value: Craft.OuterSpace, text: 'Outer Space' },
                  { value: Craft.ISS, text: 'the International Space Station' },
                ]}
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            id="outerSpaceCapacity"
            button={
              <EuiExpression
                description={outerSpaceCapacityTrigger.op}
                value={outerSpaceCapacityTrigger.outerSpaceCapacity}
                isActive={outerSpaceCapacityTrigger.isOpen}
                onClick={() => {
                  setOuterSpaceCapacity({
                    ...outerSpaceCapacityTrigger,
                    isOpen: true,
                  });
                }}
              />
            }
            isOpen={outerSpaceCapacityTrigger.isOpen}
            closePopover={() => {
              setOuterSpaceCapacity({
                ...outerSpaceCapacityTrigger,
                isOpen: false,
              });
            }}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div style={{ zIndex: 200 }}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false} style={{ width: 150 }}>
                  <EuiSelect
                    compressed
                    value={outerSpaceCapacityTrigger.op}
                    onChange={(event) => {
                      setRuleParams('op', event.target.value);
                      setOuterSpaceCapacity({
                        ...outerSpaceCapacityTrigger,
                        op: event.target.value,
                        isOpen: false,
                      });
                    }}
                    options={[
                      { value: Operator.AreAbove, text: 'Are above' },
                      { value: Operator.AreBelow, text: 'Are below' },
                      { value: Operator.AreExactly, text: 'Are exactly' },
                    ]}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false} style={{ width: 100 }}>
                  <EuiFieldNumber
                    compressed
                    value={outerSpaceCapacityTrigger.outerSpaceCapacity}
                    onChange={(event) => {
                      setRuleParams('outerSpaceCapacity', event.target.valueAsNumber);
                      setOuterSpaceCapacity({
                        ...outerSpaceCapacityTrigger,
                        outerSpaceCapacity: event.target.valueAsNumber,
                        isOpen: false,
                      });
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
