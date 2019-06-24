/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { EventDetails, View } from './event_details';

interface Props {
  browserFields: BrowserFields;
  data: DetailItem[];
  id: string;
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
}

interface State {
  view: View;
}

export class StatefulEventDetails extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { view: 'table-view' };
  }

  public onViewSelected = (view: View): void => {
    this.setState({ view });
  };

  public render() {
    const { browserFields, data, id, isLoading, onUpdateColumns, timelineId } = this.props;

    return (
      <EventDetails
        browserFields={browserFields}
        data={data}
        id={id}
        isLoading={isLoading}
        view={this.state.view}
        onUpdateColumns={onUpdateColumns}
        onViewSelected={this.onViewSelected}
        timelineId={timelineId}
      />
    );
  }
}
