/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { EventDetails, View } from './event_details';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  data: DetailItem[];
  id: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
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
    const {
      browserFields,
      columnHeaders,
      data,
      id,
      onUpdateColumns,
      timelineId,
      toggleColumn,
    } = this.props;
    return (
      <EventDetails
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        data={data}
        id={id}
        view={this.state.view}
        onUpdateColumns={onUpdateColumns}
        onViewSelected={this.onViewSelected}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
      />
    );
  }
}
