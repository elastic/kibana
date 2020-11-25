/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeModel } from '../../../../plugins/triggers_actions_ui/public';
import { DEFAULT_INSTANCES_TO_GENERATE } from '../../common/constants';

interface AlwaysFiringParamsProps {
  alertParams: { instances?: number };
  setAlertParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example.always-firing',
    name: 'Always Fires',
    description: 'Alert when called',
    iconClass: 'bolt',
    documentationUrl: null,
    alertParamsExpression: AlwaysFiringExpression,
    validate: (alertParams: AlwaysFiringParamsProps['alertParams']) => {
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

export const AlwaysFiringExpression: React.FunctionComponent<AlwaysFiringParamsProps> = ({
  alertParams,
  setAlertParams,
}) => {
  const { instances = DEFAULT_INSTANCES_TO_GENERATE } = alertParams;
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
    </Fragment>
  );
};
