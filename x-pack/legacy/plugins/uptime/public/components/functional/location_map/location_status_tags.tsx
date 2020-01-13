/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiText } from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { UptimeSettingsContext } from '../../../contexts';
import { MonitorLocation } from '../../../../common/runtime_types';

const TimeStampSpan = styled.span`
  display: inline-block;
  margin-left: 4px;
`;

const TextStyle = styled.div`
  font-weight: 600;
`;

const BadgeItem = styled.div`
  margin-bottom: 5px;
`;

const TagContainer = styled.div`
  padding: 10px;
  max-height: 229px;
  overflow: hidden;
`;

const OtherLocationsDiv = styled.div`
  padding-left: 18px;
`;

interface Props {
  locations: MonitorLocation[];
}

interface StatusTag {
  label: string;
  timestamp: number;
}

export const LocationStatusTags = ({ locations }: Props) => {
  const {
    colors: { gray, danger },
  } = useContext(UptimeSettingsContext);

  const upLocations: StatusTag[] = [];
  const downLocations: StatusTag[] = [];

  locations.forEach((item: any) => {
    if (item.summary.down === 0) {
      upLocations.push({ label: item.geo.name, timestamp: new Date(item.timestamp).valueOf() });
    } else {
      downLocations.push({ label: item.geo.name, timestamp: new Date(item.timestamp).valueOf() });
    }
  });

  // Sort by recent timestamp
  upLocations.sort((a, b) => {
    return a.timestamp < b.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0;
  });

  moment.locale('en', {
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: 'few sec',
      ss: '%s sec',
      m: 'a min',
      mm: '%d min',
      h: 'an hour',
      hh: '%d hour',
      d: 'a day',
      dd: '%d day',
      M: 'a month',
      MM: '%d Mon',
      y: 'a year',
      yy: '%d Year',
    },
  });

  const tagLabel = (item: StatusTag, ind: number, color: string) => (
    <BadgeItem key={ind}>
      <EuiBadge color={color}>
        <EuiText size="m">
          <TextStyle>{item.label}</TextStyle>
        </EuiText>
      </EuiBadge>
      <TimeStampSpan>
        <EuiText color="subdued">{moment(item.timestamp).fromNow()}</EuiText>
      </TimeStampSpan>
    </BadgeItem>
  );

  return (
    <>
      <TagContainer>
        <span>{downLocations.map((item, ind) => tagLabel(item, ind, danger))}</span>
        <span>{upLocations.map((item, ind) => tagLabel(item, ind, gray))}</span>
      </TagContainer>
      {locations.length > 7 && (
        <OtherLocationsDiv>
          <EuiText color="subdued">
            <h4>
              <FormattedMessage
                id="xpack.uptime.locationMap.locations.tags.others"
                defaultMessage="{otherLoc} Others ..."
                values={{
                  otherLoc: locations.length - 7,
                }}
              />
            </h4>
          </EuiText>
        </OtherLocationsDiv>
      )}
    </>
  );
};
