/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiTitle, EuiPanel, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TooltipSelector } from '../../../components/tooltip_selector';
import { IEmsFileSource } from './ems_file_source';
import { IField } from '../../fields/field';
import { OnSourceChangeArgs } from '../source';

interface Props {
  layerId: string;
  onChange: (...args: OnSourceChangeArgs[]) => void;
  source: IEmsFileSource;
  tooltipFields: IField[];
}

export function UpdateSourceEditor(props: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [fields, setFields] = useState<IField[]>([]);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    props.source
      .getFields()
      .then((nextFields) => {
        if (!ignore) {
          setFields(nextFields);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          // When a matching EMS-config cannot be found, the source already will have thrown errors during the data request.
          // This will propagate to the vector-layer and be displayed in the UX
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.emsSource.tooltipsTitle"
              defaultMessage="Tooltip fields"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiSkeletonText isLoading={isLoading}>
          <TooltipSelector
            tooltipFields={props.tooltipFields}
            onChange={(selectedFieldNames: string[]) => {
              props.onChange({ propName: 'tooltipProperties', value: selectedFieldNames });
            }}
            fields={fields}
          />
        </EuiSkeletonText>
      </EuiPanel>

      <EuiSpacer size="s" />
    </>
  );
}
