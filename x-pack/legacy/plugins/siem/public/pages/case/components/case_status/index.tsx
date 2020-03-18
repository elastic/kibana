/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiBadge,
  EuiButtonToggle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from '../case_view/translations';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { CaseViewActions } from '../case_view/actions';

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

interface CaseStatusProps {
  'data-test-subj': string;
  badgeColor: string;
  buttonLabel: string;
  caseId: string;
  caseTitle: string;
  icon: string;
  isLoading: boolean;
  isSelected: boolean;
  status: string;
  title: string;
  toggleStatusCase: (status: string) => void;
  value: string | null;
}
const CaseStatusComp: React.FC<CaseStatusProps> = ({
  'data-test-subj': dataTestSubj,
  badgeColor,
  buttonLabel,
  caseId,
  caseTitle,
  icon,
  isLoading,
  isSelected,
  status,
  title,
  toggleStatusCase,
  value,
}) => {
  const onChange = useCallback(e => toggleStatusCase(e.target.checked ? 'closed' : 'open'), [
    toggleStatusCase,
  ]);
  return (
    <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <MyDescriptionList compressed>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiBadge color={badgeColor} data-test-subj="case-view-status">
                  {status}
                </EuiBadge>
              </EuiDescriptionListDescription>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <FormattedRelativePreferenceDate data-test-subj={dataTestSubj} value={value} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </MyDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem>
            <EuiButtonToggle
              data-test-subj="toggle-case-status"
              iconType={icon}
              isLoading={isLoading}
              isSelected={isSelected}
              label={buttonLabel}
              onChange={onChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CaseViewActions caseId={caseId} caseTitle={caseTitle} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CaseStatus = React.memo(CaseStatusComp);
