/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import {
  EuiSuperDatePicker,
  EuiSuperDatePickerProps,
  OnRefreshChangeProps,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { getOr, take } from 'lodash/fp';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Dispatch } from 'redux';
import { inputsModel, State } from '../../store';
import { inputsActions, timelineActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';
import {
  policySelector,
  durationSelector,
  kindSelector,
  startSelector,
  endSelector,
  fromStrSelector,
  toStrSelector,
  isLoadingSelector,
  queriesSelector,
  kqlQuerySelector,
} from './selectors';
import { InputsRange, Policy } from '../../store/inputs/model';

const MAX_RECENTLY_USED_RANGES = 9;

type MyEuiSuperDatePickerProps = Pick<
  EuiSuperDatePickerProps,
  | 'end'
  | 'isPaused'
  | 'onTimeChange'
  | 'onRefreshChange'
  | 'onRefresh'
  | 'recentlyUsedRanges'
  | 'refreshInterval'
  | 'showUpdateButton'
  | 'start'
> & {
  isLoading?: boolean;
};
const MyEuiSuperDatePicker: React.SFC<MyEuiSuperDatePickerProps> = EuiSuperDatePicker;

interface SuperDatePickerStateRedux {
  duration: number;
  policy: Policy['kind'];
  kind: string;
  fromStr: string;
  toStr: string;
  start: number;
  end: number;
  isLoading: boolean;
  queries: inputsModel.GlobalGraphqlQuery[];
  kqlQuery: inputsModel.GlobalKqlQuery;
}

interface UpdateReduxTime extends OnTimeChangeProps {
  id: InputsModelId;
  kql?: inputsModel.GlobalKqlQuery | undefined;
  timelineId?: string;
}

interface ReturnUpdateReduxTime {
  kqlHaveBeenUpdated: boolean;
}

type DispatchUpdateReduxTime = ({
  end,
  id,
  isQuickSelection,
  kql,
  start,
  timelineId,
}: UpdateReduxTime) => ReturnUpdateReduxTime;

interface SuperDatePickerDispatchProps {
  startAutoReload: ({ id }: { id: InputsModelId }) => void;
  stopAutoReload: ({ id }: { id: InputsModelId }) => void;
  setDuration: ({ id, duration }: { id: InputsModelId; duration: number }) => void;
  updateReduxTime: DispatchUpdateReduxTime;
}

interface OwnProps {
  id: InputsModelId;
  disabled?: boolean;
  timelineId?: string;
}

interface TimeArgs {
  start: string;
  end: string;
}

export type SuperDatePickerProps = OwnProps &
  SuperDatePickerDispatchProps &
  SuperDatePickerStateRedux;

export interface SuperDatePickerState {
  isQuickSelection: boolean;
  recentlyUsedRanges: TimeArgs[];
  showUpdateButton: boolean;
}

export const SuperDatePickerComponent = class extends Component<
  SuperDatePickerProps,
  SuperDatePickerState
> {
  constructor(props: SuperDatePickerProps) {
    super(props);

    this.state = {
      isQuickSelection: true,
      recentlyUsedRanges: [],
      showUpdateButton: true,
    };
  }

  public render() {
    const { duration, end, start, kind, fromStr, policy, toStr, isLoading } = this.props;
    const endDate = kind === 'relative' ? toStr : new Date(end).toISOString();
    const startDate = kind === 'relative' ? fromStr : new Date(start).toISOString();

    return (
      <MyEuiSuperDatePicker
        end={endDate}
        isLoading={isLoading}
        isPaused={policy === 'manual'}
        onTimeChange={this.onTimeChange}
        onRefreshChange={this.onRefreshChange}
        onRefresh={this.onRefresh}
        recentlyUsedRanges={this.state.recentlyUsedRanges}
        refreshInterval={duration}
        showUpdateButton={this.state.showUpdateButton}
        start={startDate}
      />
    );
  }
  private onRefresh = ({ start, end, refreshInterval }: OnRefreshProps): void => {
    const { kqlHaveBeenUpdated } = this.props.updateReduxTime({
      end,
      id: this.props.id,
      isInvalid: false,
      isQuickSelection: this.state.isQuickSelection,
      kql: this.props.kqlQuery,
      start,
      timelineId: this.props.timelineId,
    });
    const currentStart = formatDate(start);
    const currentEnd = this.state.isQuickSelection
      ? formatDate(end, { roundUp: true })
      : formatDate(end);
    if (
      !kqlHaveBeenUpdated &&
      (!this.state.isQuickSelection ||
        (this.props.start === currentStart && this.props.end === currentEnd))
    ) {
      this.refetchQuery(this.props.queries);
    }
  };

  private onRefreshChange = ({ isPaused, refreshInterval }: OnRefreshChangeProps): void => {
    const { id, duration, policy, stopAutoReload, startAutoReload } = this.props;
    if (duration !== refreshInterval) {
      this.props.setDuration({ id, duration: refreshInterval });
    }

    if (isPaused && policy === 'interval') {
      stopAutoReload({ id });
    } else if (!isPaused && policy === 'manual') {
      startAutoReload({ id });
    }

    if (
      !isPaused &&
      (!this.state.isQuickSelection || (this.state.isQuickSelection && this.props.toStr !== 'now'))
    ) {
      this.refetchQuery(this.props.queries);
    }
  };

  private refetchQuery = (queries: inputsModel.GlobalGraphqlQuery[]) => {
    queries.forEach(q => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  private onTimeChange = ({ start, end, isQuickSelection, isInvalid }: OnTimeChangeProps) => {
    if (!isInvalid) {
      this.props.updateReduxTime({
        end,
        id: this.props.id,
        isInvalid,
        isQuickSelection,
        kql: this.props.kqlQuery,
        start,
        timelineId: this.props.timelineId,
      });
      this.setState((prevState: SuperDatePickerState) => {
        const recentlyUsedRanges = [
          { start, end },
          ...take(
            MAX_RECENTLY_USED_RANGES,
            prevState.recentlyUsedRanges.filter(
              recentlyUsedRange =>
                !(recentlyUsedRange.start === start && recentlyUsedRange.end === end)
            )
          ),
        ];

        return {
          recentlyUsedRanges,
          isQuickSelection,
        };
      });
    }
  };
};

const formatDate = (
  date: string,
  options?: {
    roundUp?: boolean;
  }
) => {
  const momentDate = dateMath.parse(date, options);
  return momentDate != null && momentDate.isValid() ? momentDate.valueOf() : 0;
};

const dispatchUpdateReduxTime = (dispatch: Dispatch) => ({
  end,
  id,
  isQuickSelection,
  kql,
  start,
  timelineId,
}: UpdateReduxTime): ReturnUpdateReduxTime => {
  const fromDate = formatDate(start);
  let toDate = formatDate(end, { roundUp: true });
  if (isQuickSelection) {
    dispatch(
      inputsActions.setRelativeRangeDatePicker({
        id,
        fromStr: start,
        toStr: end,
        from: fromDate,
        to: toDate,
      })
    );
  } else {
    toDate = formatDate(end);
    dispatch(
      inputsActions.setAbsoluteRangeDatePicker({
        id,
        from: formatDate(start),
        to: formatDate(end),
      })
    );
  }
  if (timelineId != null) {
    dispatch(
      timelineActions.updateRange({
        id: timelineId,
        start: fromDate,
        end: toDate,
      })
    );
  }

  if (kql) {
    return {
      kqlHaveBeenUpdated: kql.refetch(dispatch),
    };
  }

  return {
    kqlHaveBeenUpdated: false,
  };
};

export const makeMapStateToProps = () => {
  const getPolicySelector = policySelector();
  const getDurationSelector = durationSelector();
  const getKindSelector = kindSelector();
  const getStartSelector = startSelector();
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getToStrSelector = toStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getQueriesSelector = queriesSelector();
  const getKqlQuerySelector = kqlQuerySelector();
  return (state: State, { id }: OwnProps) => {
    const inputsRange: InputsRange = getOr({}, `inputs.${id}`, state);
    return {
      policy: getPolicySelector(inputsRange),
      duration: getDurationSelector(inputsRange),
      kind: getKindSelector(inputsRange),
      start: getStartSelector(inputsRange),
      end: getEndSelector(inputsRange),
      fromStr: getFromStrSelector(inputsRange),
      toStr: getToStrSelector(inputsRange),
      isLoading: getIsLoadingSelector(inputsRange),
      queries: getQueriesSelector(inputsRange),
      kqlQuery: getKqlQuerySelector(inputsRange),
    };
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  startAutoReload: ({ id }: { id: InputsModelId }) =>
    dispatch(inputsActions.startAutoReload({ id })),
  stopAutoReload: ({ id }: { id: InputsModelId }) => dispatch(inputsActions.stopAutoReload({ id })),
  setDuration: ({ id, duration }: { id: InputsModelId; duration: number }) =>
    dispatch(inputsActions.setDuration({ id, duration })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const SuperDatePicker = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(SuperDatePickerComponent);
