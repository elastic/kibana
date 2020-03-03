/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import {
  FormattedRelativePreferenceDate,
  FormattedRelativePreferenceLabel,
} from '../../../../components/formatted_date';
import * as i18n from '../case_view/translations';
import { PropertyActions } from '../property_actions';

const MySpinner = styled(EuiLoadingSpinner)`
  .euiLoadingSpinner {
    margin-top: 1px; // yes it matters!
  }
`;

interface UserActionTitleProps {
  createdAt: string;
  id: string;
  isLoading: boolean;
  labelAction: string;
  labelTitle: string;
  userName: string;
  onEdit: (id: string) => void;
}

export const UserActionTitle = ({
  createdAt,
  id,
  isLoading,
  labelAction,
  labelTitle,
  userName,
  onEdit,
}: UserActionTitleProps) => {
  const propertyActions = useMemo(() => {
    return [
      {
        iconType: 'documentEdit',
        label: labelAction,
        onClick: () => onEdit(id),
      },
    ];
  }, [id, onEdit]);
  return (
    <EuiText size="s" className="userAction__title" data-test-subj={`user-action-title`}>
      <EuiFlexGroup alignItems="baseline" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <p>
            <strong>{userName}</strong>
            {` ${labelTitle} `}
            <FormattedRelativePreferenceLabel value={createdAt} preferenceLabel={`${i18n.ON} `} />
            <FormattedRelativePreferenceDate value={createdAt} />
          </p>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoading && <MySpinner />}
          {!isLoading && <PropertyActions propertyActions={propertyActions} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
