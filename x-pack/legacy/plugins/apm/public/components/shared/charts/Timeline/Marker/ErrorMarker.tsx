/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../../../common/elasticsearch_fieldnames';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { fontSizes, px, unit } from '../../../../../style/variables';
import { asDuration } from '../../../../../utils/formatters';
import { ErrorDetailLink } from '../../../Links/apm/ErrorDetailLink';
import { Legend, Shape } from '../../Legend';

interface Props {
  mark: any; // TODO: error mark,
}

const Popover = styled.div`
  max-width: ${px(280)};
`;

const Label = styled.div`
  font-size: ${fontSizes.small};
  padding-bottom: ${px(unit)};
  &:last-of-type {
    padding-bottom: 0;
  }
`;

const Link = styled.div`
  margin: ${px(unit)} 0 ${px(unit)} 0;
`;

export const ErrorMarker: React.FC<Props> = ({ mark }) => {
  const { urlParams } = useUrlParams();
  const [isPopoverOpen, showPopover] = useState(false);

  const legend = (
    <Legend
      clickable
      color={theme.euiColorDanger}
      shape={Shape.square}
      onClick={() => showPopover(true)}
    />
  );

  const { rangeTo, rangeFrom } = urlParams;
  const query = {
    kuery: encodeURIComponent(
      `${TRACE_ID} : "${mark.traceId}" and ${TRANSACTION_ID} : "${mark.transactionId}"`
    ),
    rangeFrom,
    rangeTo
  };

  return (
    <EuiPopover
      id="popover"
      button={legend}
      isOpen={isPopoverOpen}
      closePopover={() => showPopover(false)}
      anchorPosition="upCenter"
    >
      <Popover>
        <Label>{`@ ${asDuration(mark.us)}`}</Label>
        <Legend
          key={mark.service.color}
          color={mark.service.color}
          text={mark.service.name}
        />
        <Link>
          <ErrorDetailLink
            serviceName={mark.service.name}
            errorGroupId={mark.errorGroupId}
            query={query}
          >
            {mark.message}
          </ErrorDetailLink>
        </Link>
        <Label>{`${mark.occurences} occurences (avg.)`}</Label>
      </Popover>
    </EuiPopover>
  );
};
