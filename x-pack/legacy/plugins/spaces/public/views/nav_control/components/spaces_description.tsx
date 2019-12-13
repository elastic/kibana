/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuPanel, EuiText } from '@elastic/eui';
import React, { FC } from 'react';
import { ManageSpacesButton } from '../../../components';
import { getSpacesFeatureDescription } from '../../../lib/constants';

interface Props {
  onManageSpacesClick: () => void;
}

export const SpacesDescription: FC<Props> = (props: Props) => {
  const panelProps = {
    className: 'spcDescription',
    title: 'Spaces',
  };

  return (
    <EuiContextMenuPanel {...panelProps}>
      <EuiText className="spcDescription__text">
        <p>{getSpacesFeatureDescription()}</p>
      </EuiText>
      <div key="manageSpacesButton" className="spcDescription__manageButtonWrapper">
        <ManageSpacesButton
          size="s"
          style={{ width: `100%` }}
          onClick={props.onManageSpacesClick}
        />
      </div>
    </EuiContextMenuPanel>
  );
};
