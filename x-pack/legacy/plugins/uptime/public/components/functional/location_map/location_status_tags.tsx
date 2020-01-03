/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiText } from '@elastic/eui';
import { UptimeSettingsContext } from '../../../contexts';

const TextStyle = styled.div`
  font-weight: 600;
`;

const BadgeItem = styled.div`
  margin-bottom: 5px;
`;

const TagContainer = styled.div`
  padding: 10px;
  max-height: 300px;
  overflow: hidden;
`;

interface Props {
  monitorLocations: any;
}

export const LocationStatusTags = ({ monitorLocations }: Props) => {
  const {
    colors: { gray, danger },
  } = useContext(UptimeSettingsContext);

  const upLocs: string[] = [];
  const downLocs: string[] = [];

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach((item: any) => {
      if (item.summary.down === 0) {
        upLocs.push(item.geo.name);
      } else {
        downLocs.push(item.geo.name);
      }
    });
  }
  return (
    <TagContainer>
      <span>
        {downLocs.map((item, ind) => (
          <BadgeItem key={ind}>
            <EuiBadge color={danger}>
              <EuiText size="m">
                <TextStyle>{item}</TextStyle>
              </EuiText>
            </EuiBadge>
          </BadgeItem>
        ))}
      </span>
      <span>
        {upLocs.map((item, ind) => (
          <BadgeItem key={ind}>
            <EuiBadge color={gray}>
              <EuiText size="m">
                <TextStyle>{item}</TextStyle>
              </EuiText>
            </EuiBadge>
          </BadgeItem>
        ))}
      </span>
    </TagContainer>
  );
};
