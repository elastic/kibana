/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { SUPPORTED_FIELD_TYPES } from '../../../../../../../common/constants';
import { useDataVisualizerKibana } from '../../../../../kibana_context';
import type { FieldDataRowProps } from '../../types';

interface Props extends FieldDataRowProps {
  showIcon?: boolean;
}

export const DistinctValues = ({ showIcon, config }: Props) => {
  const { stats, type } = config;
  const {
    services: {
      data: { fieldFormats },
    },
  } = useDataVisualizerKibana();

  const cardinality = stats?.cardinality;

  if (cardinality === undefined || stats === undefined) return null;

  const { sampleCount } = stats;

  const tooltipContent =
    type === SUPPORTED_FIELD_TYPES.TEXT ? (
      <FormattedMessage
        id="xpack.dataVisualizer.sampledCardinalityForTextFieldsMsg"
        defaultMessage="The cardinality for text fields is calculated from a sample of {sampledDocumentsFormatted} {sampledDocuments, plural, one {record} other {records}}."
        values={{
          sampledDocuments: sampleCount,
          sampledDocumentsFormatted: (
            <strong>
              {fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(sampleCount)}
            </strong>
          ),
        }}
      />
    ) : null;

  const icon = showIcon ? (
    type === SUPPORTED_FIELD_TYPES.TEXT ? (
      <EuiToolTip content={tooltipContent}>
        <EuiIcon type="partial" size={'m'} className={'columnHeader__icon'} />
      </EuiToolTip>
    ) : (
      <EuiIcon type="database" size={'m'} className={'columnHeader__icon'} />
    )
  ) : null;

  const content = <EuiText size={'xs'}>{cardinality}</EuiText>;

  return (
    <>
      {icon}
      <EuiToolTip content={tooltipContent}>{content}</EuiToolTip>
    </>
  );
};
