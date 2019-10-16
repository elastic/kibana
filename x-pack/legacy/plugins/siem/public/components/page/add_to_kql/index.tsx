/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';
import { Query } from 'src/plugins/data/common';

import { WithHoverActions } from '../../with_hover_actions';
import { InputsModelId } from '../../../store/inputs/constants';
import { siemFilterManager } from '../../search_bar';

import * as i18n from './translations';
import { filterQuerySelector } from '../../search_bar/selectors';
import { State } from '../../../store';
import { InputsRange } from '../../../store/inputs/model';

export * from './helpers';

interface AddToKqlRedux {
  query: Query;
}

interface OwnProps {
  id: InputsModelId;
  children: JSX.Element;
  indexPattern: StaticIndexPattern;
  filter: Filter;
}

const AddToKqlComponent = React.memo<OwnProps & AddToKqlRedux>(
  ({ children, id, indexPattern, filter, query }) => {
    const addToKql = () => {
      siemFilterManager.addFilters(filter);
    };
    return (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
              <EuiIcon type="filter" onClick={addToKql} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
        render={() => children}
      />
    );
  }
);

AddToKqlComponent.displayName = 'AddToKqlComponent';

export const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
  cursor: pointer;
`;

const makeMapStateToProps = () => {
  const getFilterQuerySelector = filterQuerySelector();
  return (state: State, { id }: OwnProps) => {
    const inputsRange: InputsRange = getOr({}, `inputs.${id}`, state);
    return {
      query: getFilterQuerySelector(inputsRange),
    };
  };
};

export const AddToKql = connect(makeMapStateToProps)(AddToKqlComponent);
