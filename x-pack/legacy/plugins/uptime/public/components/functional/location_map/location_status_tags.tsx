/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiBadge, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UptimeThemeContext } from '../../../contexts';
import { MonitorLocation } from '../../../../common/runtime_types';
import { SHORT_TIMESPAN_LOCALE, SHORT_TS_LOCALE } from '../../../../common/constants';

const TimeStampSpan = styled.span`
  display: inline-block;
  margin-left: 4px;
`;

const TextStyle = styled.div`
  font-weight: 600;
`;

const BadgeItem = styled.div`
  margin-bottom: 5px;
  white-space: nowrap;
  @media (max-width: 830px) {
    display: inline-block;
    margin-right: 16px;
  }
`;

// Set height so that it remains within panel, enough height to display 7 locations tags
const TagContainer = styled.div`
  max-height: 229px;
  overflow: hidden;
  margin-top: auto;
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
  } = useContext(UptimeThemeContext);

  const upLocations: StatusTag[] = [];
  const downLocations: StatusTag[] = [];

  locations.forEach((item: any) => {
    if (item.summary.down === 0) {
      upLocations.push({ label: item.geo.name, timestamp: new Date(item.timestamp).valueOf() });
    } else {
      downLocations.push({ label: item.geo.name, timestamp: new Date(item.timestamp).valueOf() });
    }
  });

  // Sort lexicographically by label
  upLocations.sort((a, b) => {
    return a.label > b.label ? 1 : b.label > a.label ? -1 : 0;
  });

  const tagLabel = (item: StatusTag, ind: number, color: string) => {
    return (
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
  };

  const prevLocal: string = moment.locale() ?? 'en';

  const renderTags = () => {
    const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;
    if (!shortLocale) {
      moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
    }

    const tags = (
      <TagContainer>
        <span>{downLocations.map((item, ind) => tagLabel(item, ind, danger))}</span>
        <span>{upLocations.map((item, ind) => tagLabel(item, ind, gray))}</span>
      </TagContainer>
    );

    // Need to reset locale so it doesn't effect other parts of the app
    moment.locale(prevLocal);
    return tags;
  };

  return (
    <>
      {renderTags()}
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
