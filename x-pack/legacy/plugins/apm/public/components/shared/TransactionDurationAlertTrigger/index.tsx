/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { map } from 'lodash';
import { EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  TRANSACTION_ALERT_AGGREGATION_TYPES,
  ALERT_TYPES_CONFIG
} from '../../../../../../../plugins/apm/common/alert_types';
import { DurationField } from '../ServiceAlertTrigger/DurationField';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';

interface Params {
  window: string;
  threshold: number;
  aggregationType: 'avg' | '95th' | '99th';
  serviceName: string;
  transactionType: string;
}

interface Props {
  alertParams: Params;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;

  const { urlParams } = useUrlParams();

  const transactionTypes = useServiceTransactionTypes(urlParams);

  const fields = [
    {
      name: 'transactionType',
      title: i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.setTransactionType',
        {
          defaultMessage: 'Set transaction type'
        }
      ),
      field: (
        <EuiSelect
          value={alertParams.transactionType}
          options={transactionTypes.map(key => {
            return {
              text: key,
              value: key
            };
          })}
          onChange={e =>
            setAlertParams(
              'transactionType',
              e.target.value as Params['transactionType']
            )
          }
          compressed
        />
      )
    },
    {
      name: 'type',
      title: i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.setType',
        {
          defaultMessage: 'Set type'
        }
      ),
      field: (
        <EuiSelect
          value={alertParams.aggregationType}
          options={map(TRANSACTION_ALERT_AGGREGATION_TYPES, (label, key) => {
            return {
              text: label,
              value: key
            };
          })}
          onChange={e =>
            setAlertParams(
              'aggregationType',
              e.target.value as Params['aggregationType']
            )
          }
          compressed
        />
      )
    },
    {
      name: 'threshold',
      title: i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.setThreshold',
        {
          defaultMessage: 'Set threshold'
        }
      ),
      field: (
        <EuiFieldNumber
          value={alertParams.threshold ?? ''}
          onChange={e => setAlertParams('threshold', e.target.value)}
          append={i18n.translate(
            'xpack.apm.transactionDurationAlertTrigger.ms',
            {
              defaultMessage: 'ms'
            }
          )}
          compressed
        />
      )
    },
    {
      name: 'interval',
      title: i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.setWindow',
        {
          defaultMessage: 'Set window'
        }
      ),
      field: (
        <DurationField
          duration={alertParams.window}
          onChange={duration => setAlertParams('window', duration)}
        />
      )
    }
  ];

  if (!transactionTypes.length) {
    return null;
  }

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG['apm.transaction_duration'].name}
      fields={fields}
      defaults={{
        threshold: 1500,
        aggregationType: 'avg',
        window: '5m',
        transactionType: transactionTypes[0]
      }}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}
