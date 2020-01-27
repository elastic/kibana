/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import {
  droppableTimelineProvidersPrefix,
  IS_DRAGGING_CLASS_NAME,
} from '../../drag_and_drop/helpers';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { TimelineContext } from '../timeline_context';

import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { Providers } from './providers';

interface Props {
  browserFields: BrowserFields;
  id: string;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
}

const DropTargetDataProvidersContainer = styled.div`
  .${IS_DRAGGING_CLASS_NAME} & .drop-target-data-providers {
    background: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.1)};
    border: 0.2rem dashed ${({ theme }) => theme.eui.euiColorSuccess};

    & .euiTextColor--subdued {
      color: ${({ theme }) => theme.eui.euiColorSuccess};
    }

    & .euiFormHelpText {
      color: ${({ theme }) => theme.eui.euiColorSuccess};
    }
  }
`;

const DropTargetDataProviders = styled.div`
  position: relative;
  border: 0.2rem dashed ${props => props.theme.eui.euiColorMediumShade};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 5px 0 5px 0;
  min-height: 100px;
  overflow-y: auto;
  background-color: ${props => props.theme.eui.euiFormBackgroundColor};
`;

DropTargetDataProviders.displayName = 'DropTargetDataProviders';

const getDroppableId = (id: string): string => `${droppableTimelineProvidersPrefix}${id}`;

/**
 * Renders the data providers section of the timeline.
 *
 * The data providers section is a drop target where users
 * can drag-and drop new data providers into the timeline.
 *
 * It renders an interactive card representation of the
 * data providers. It also provides uniform
 * UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 *
 * Given an empty collection of DataProvider[], it prompts
 * the user to drop anything with a facet count into
 * the data pro section.
 */
export const DataProviders = React.memo<Props>(
  ({
    browserFields,
    id,
    dataProviders,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderEdited,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    show,
  }) => (
    <DropTargetDataProvidersContainer className="drop-target-data-providers-container">
      <DropTargetDataProviders
        className="drop-target-data-providers"
        data-test-subj="dataProviders"
      >
        <TimelineContext.Consumer>
          {isLoading => (
            <DroppableWrapper isDropDisabled={!show || isLoading} droppableId={getDroppableId(id)}>
              {dataProviders != null && dataProviders.length ? (
                <Providers
                  browserFields={browserFields}
                  id={id}
                  dataProviders={dataProviders}
                  onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                  onChangeDroppableAndProvider={onChangeDroppableAndProvider}
                  onDataProviderEdited={onDataProviderEdited}
                  onDataProviderRemoved={onDataProviderRemoved}
                  onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                  onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                />
              ) : (
                <Empty />
              )}
            </DroppableWrapper>
          )}
        </TimelineContext.Consumer>
      </DropTargetDataProviders>
    </DropTargetDataProvidersContainer>
  )
);

DataProviders.displayName = 'DataProviders';
