/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_TYPES_CONFIG } from '../../../../../../../plugins/apm/common/alert_types';
import { DurationField } from '../ServiceAlertTrigger/DurationField';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';

export interface ErrorRateAlertTriggerParams {
  window: string;
  threshold: number;
}

interface Props {
  alertParams: ErrorRateAlertTriggerParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorRateAlertTrigger(props: Props) {
  const { setAlertParams, setAlertProperty, alertParams } = props;

  const defaults = {
    threshold: 2,
    window: '5m'
  };

  const fields = [
    {
      name: 'threshold',
      title: i18n.translate('xpack.apm.errorRateAlertTrigger.setThreshold', {
        defaultMessage: 'Set threshold'
      }),
      field: (
        <EuiFieldNumber
          value={alertParams.threshold ?? ''}
          step={0}
          onChange={e =>
            setAlertParams('threshold', parseInt(e.target.value, 10))
          }
          compressed
          append={i18n.translate('xpack.apm.errorRateAlertTrigger.errors', {
            defaultMessage: 'errors'
          })}
        />
      )
    },
    {
      name: 'window',
      title: i18n.translate('xpack.apm.errorRateAlertTrigger.setWindow', {
        defaultMessage: 'Set window'
      }),
      field: (
        <DurationField
          duration={alertParams.window}
          onChange={duration => setAlertParams('window', duration)}
        />
      )
    }
  ];

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG['apm.error_rate'].name}
      defaults={defaults}
      fields={fields}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}
