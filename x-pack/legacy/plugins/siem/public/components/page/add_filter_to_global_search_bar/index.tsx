/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { Filter } from '../../../../../../../../src/plugins/data/public';
import { WithHoverActions } from '../../with_hover_actions';
import { useKibana } from '../../../lib/kibana';

import * as i18n from './translations';

export * from './helpers';

interface OwnProps {
  children: JSX.Element;
  filter: Filter;
  onFilterAdded?: () => void;
}

export const AddFilterToGlobalSearchBar = React.memo<OwnProps>(
  ({ children, filter, onFilterAdded }) => {
    const { filterManager } = useKibana().services.data.query;

    const addToKql = useCallback(() => {
      filterManager.addFilters(filter);
      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }, [filter, filterManager, onFilterAdded]);

    return (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container" paddingSize="none">
            <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
              <EuiIcon data-test-subj="add-to-filter" type="filter" onClick={addToKql} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
        render={() => children}
      />
    );
  }
);

AddFilterToGlobalSearchBar.displayName = 'AddFilterToGlobalSearchBar';

export const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 34px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 34px;
  cursor: pointer;
`;
