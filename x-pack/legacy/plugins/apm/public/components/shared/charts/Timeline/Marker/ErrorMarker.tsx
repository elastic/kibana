/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover, EuiText } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../../../common/elasticsearch_fieldnames';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { px, unit, units } from '../../../../../style/variables';
import { asDuration } from '../../../../../utils/formatters';
import { ErrorDetailLink } from '../../../Links/apm/ErrorDetailLink';
import { Legend, Shape } from '../../Legend';
import { IWaterfallItemError } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  mark: IWaterfallItemError;
}

const Popover = styled.div`
  max-width: ${px(280)};
`;

const TimeLegend = styled(Legend)`
  margin-bottom: ${px(unit)};
`;

const ErrorLink = styled(ErrorDetailLink)`
  display: block;
  margin: ${px(units.half)} 0 ${px(units.half)} 0;
`;

export const ErrorMarker: React.FC<Props> = ({ mark }) => {
  const { urlParams } = useUrlParams();
  const [isPopoverOpen, showPopover] = useState(false);

  const togglePopover = () => showPopover(!isPopoverOpen);

  const legend = (
    <Legend
      clickable
      color={theme.euiColorDanger}
      shape={Shape.square}
      onClick={togglePopover}
    />
  );

  const { rangeTo, rangeFrom } = urlParams;
  const query = {
    kuery: encodeURIComponent(
      `${TRACE_ID} : "${mark.error.trace?.id}" and ${TRANSACTION_ID} : "${mark.error.transaction?.id}"`
    ),
    rangeFrom,
    rangeTo
  };

  return (
    <EuiPopover
      id="popover"
      button={legend}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      anchorPosition="upCenter"
    >
      <Popover>
        <TimeLegend
          text={asDuration(mark.offset + mark.skew)}
          indicator={() => (
            <div style={{ marginRight: px(units.quarter) }}>@</div>
          )}
        />
        <Legend
          key={mark.serviceColor}
          color={mark.serviceColor}
          text={mark.serviceName}
        />
        <EuiText size="s">
          <ErrorLink
            serviceName={mark.serviceName}
            errorGroupId={mark.error.error.grouping_key}
            query={query}
          >
            {mark.message}
          </ErrorLink>
        </EuiText>
      </Popover>
    </EuiPopover>
  );
};
