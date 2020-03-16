/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import {
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText
} from '@elastic/eui';
import { useUrlParams } from '../../../hooks/useUrlParams';

interface FieldProps {
  title: React.ReactNode;
  field: React.ReactNode;
  name: string;
}

interface Props {
  alertTypeName: string;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  fields: FieldProps[];
  defaults: Record<string, any>;
}

const Field = (props: FieldProps) => {
  const { title, field } = props;

  return (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{field}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export function ServiceAlertTrigger(props: Props) {
  const { urlParams } = useUrlParams();

  const {
    fields,
    setAlertParams,
    setAlertProperty,
    alertTypeName,
    defaults
  } = props;

  const params: Record<string, any> = {
    ...defaults,
    serviceName: urlParams.serviceName!
  };

  useEffect(() => {
    // we only want to run this on mount to set default values
    setAlertProperty('name', `${alertTypeName} | ${params.serviceName}`);
    setAlertProperty('tags', ['apm']);
    Object.keys(params).forEach(key => {
      setAlertParams(key, params[key]);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGrid gutterSize="l" direction="row" columns={2}>
        {fields.map(field => (
          <Field key={field.name} {...field} />
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="m" />
    </>
  );
}
