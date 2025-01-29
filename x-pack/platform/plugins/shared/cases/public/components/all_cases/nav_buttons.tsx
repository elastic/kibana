/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { ConfigureCaseButton, LinkButton } from '../links';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
import { useCreateCaseNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';

interface OwnProps {
  actionsErrors: ErrorMessage[];
}

type Props = OwnProps;

export const NavButtons: FunctionComponent<Props> = ({ actionsErrors }) => {
  const { permissions } = useCasesContext();
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();
  const { euiTheme } = useEuiTheme();
  const navigateToCreateCaseClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      navigateToCreateCase();
    },
    [navigateToCreateCase]
  );

  if (!permissions.create && !permissions.settings) {
    return null;
  }

  return (
    <EuiFlexItem>
      <EuiFlexGroup
        responsive={false}
        css={css`
          & {
            @media only screen and (max-width: ${euiTheme.breakpoint.s}) {
              flex-direction: column;
            }
          }
        `}
      >
        {permissions.settings && (
          <EuiFlexItem grow={false}>
            <ConfigureCaseButton
              label={i18n.CONFIGURE_CASES_BUTTON}
              showToolTip={!isEmpty(actionsErrors)}
              msgTooltip={!isEmpty(actionsErrors) ? <>{actionsErrors[0].description}</> : <></>}
              titleTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].title : ''}
            />
          </EuiFlexItem>
        )}
        {permissions.create && (
          <EuiFlexItem>
            <LinkButton
              fill
              onClick={navigateToCreateCaseClick}
              href={getCreateCaseUrl()}
              iconType="plusInCircle"
              data-test-subj="createNewCaseBtn"
            >
              {i18n.CREATE_CASE_TITLE}
            </LinkButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
NavButtons.displayName = 'NavButtons';
