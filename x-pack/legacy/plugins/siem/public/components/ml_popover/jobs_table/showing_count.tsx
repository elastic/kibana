/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';

import { EuiText } from '@elastic/eui';

const ShowingContainer = styled.div`
  user-select: none;
  margin-top: 5px;
`;

ShowingContainer.displayName = 'ShowingContainer';

export interface ShowingCountProps {
  filterResultsLength: number;
}

export const ShowingCountComponent = ({ filterResultsLength }: ShowingCountProps) => (
  <ShowingContainer data-test-subj="showing">
    <EuiText color="subdued" size="xs">
      <FormattedMessage
        data-test-subj="query-message"
        defaultMessage="Showing: {filterResultsLength} {filterResultsLength, plural, one {job} other {jobs}}"
        id="xpack.siem.components.mlPopup.showingLabel"
        values={{
          filterResultsLength,
        }}
      />
    </EuiText>
  </ShowingContainer>
);

ShowingCountComponent.displayName = 'ShowingCountComponent';

export const ShowingCount = React.memo(ShowingCountComponent);

ShowingCount.displayName = 'ShowingCount';
