/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
// @ts-ignore
import { StickyContainer } from 'react-sticky';
import styled from 'styled-components';
import { px } from '../../../../../../style/variables';
import { history } from '../../../../../../utils/history';
// @ts-ignore
import Timeline from '../../../../../shared/charts/Timeline';
import { fromQuery, toQuery } from '../../../../../shared/Links/url_helpers';
import { WaterfallFlyout } from './WaterfallFlyout';
import { WaterfallItem } from './WaterfallItem';
import {
  IWaterfall,
  IWaterfallItem
} from './waterfall_helpers/waterfall_helpers';

const Container = styled.div`
  transition: 0.1s padding ease;
  position: relative;
  overflow: hidden;
`;

const TIMELINE_MARGINS = {
  top: 40,
  left: 50,
  right: 50,
  bottom: 0
};

const toggleFlyout = ({
  item,
  location
}: {
  item?: IWaterfallItem;
  location: Location;
}) => {
  history.replace({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      ...{
        flyoutDetailTab: undefined,
        waterfallItemId: item ? String(item.id) : undefined
      }
    })
  });
};

const WaterfallItemsContainer = styled.div<{
  paddingTop: number;
}>`
  padding-top: ${props => px(props.paddingTop)};
`;

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  location: Location;
  exceedsMax: boolean;
}

export const Waterfall: React.FC<Props> = ({
  waterfall,
  exceedsMax,
  waterfallItemId,
  location
}) => {
  const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
  const waterfallHeight = itemContainerHeight * waterfall.items.length;

  const { serviceColors, duration } = waterfall;

  const marks = waterfall.items.filter(
    item => item.docType === 'error' || item.docType === 'agentMark'
  );

  const renderWaterfallItem = (item: IWaterfallItem) => {
    if (item.docType === 'error' || item.docType === 'agentMark') {
      return null;
    }
    const errorCount =
      item.docType === 'transaction'
        ? waterfall.errorCountByTransactionId[item.transaction.transaction.id]
        : 0;

    return (
      <WaterfallItem
        key={item.id}
        timelineMargins={TIMELINE_MARGINS}
        color={serviceColors[item.serviceName]}
        item={item}
        totalDuration={duration}
        isSelected={item.id === waterfallItemId}
        errorCount={errorCount}
        onClick={() => toggleFlyout({ item, location })}
      />
    );
  };

  return (
    <Container>
      {exceedsMax && (
        <EuiCallOut
          color="warning"
          size="s"
          iconType="alert"
          title={i18n.translate('xpack.apm.waterfall.exceedsMax', {
            defaultMessage:
              'Number of items in this trace exceed what is displayed'
          })}
        />
      )}
      <StickyContainer>
        <Timeline
          marks={marks}
          duration={duration}
          height={waterfallHeight}
          margins={TIMELINE_MARGINS}
        />
        <WaterfallItemsContainer paddingTop={TIMELINE_MARGINS.top}>
          {waterfall.items.map(renderWaterfallItem)}
        </WaterfallItemsContainer>
      </StickyContainer>

      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        location={location}
        toggleFlyout={toggleFlyout}
      />
    </Container>
  );
};
