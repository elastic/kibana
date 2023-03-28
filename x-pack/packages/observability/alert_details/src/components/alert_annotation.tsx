/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  alertStarted: number;
  color: string;
  dateFormat: string;
  id: string;
}

export function AlertAnnotation({ alertStarted, color, dateFormat, id }: Props) {
  return (
    <LineAnnotation
      id={id}
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: alertStarted,
          header: moment(alertStarted).format(dateFormat),
          details: i18n.translate('xpack.packages.observability.alertDetails.alertStarted', {
            defaultMessage: 'Alert started',
          }),
        },
      ]}
      style={{
        line: {
          strokeWidth: 3,
          stroke: color,
          opacity: 1,
        },
      }}
      marker={<EuiIcon type="warning" color={color} />}
      markerPosition={Position.Top}
    />
  );
}
