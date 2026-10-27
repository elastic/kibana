/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { BoostServices } from '../../types';
import { BoostIndexDetails } from './boost_tab';
import { DataStreamBoostDetail, EditDataStreamRule } from './data_stream_details';
import { CardActions, CardProfile, CardRule } from './overview_card';

/**
 * A part of what Index Management shows of an index's or data stream's boost: the index overview
 * card's rule, actions, and profile; the index's Search boost tab; or the data stream flyout's
 * detail, and the rule flyout its menu opens.
 */
export type IndexManagementPart =
  | 'cardRule'
  | 'cardActions'
  | 'cardProfile'
  | 'tab'
  | 'dataStream'
  | 'dataStreamEditRule';

export interface IndexManagementPartProps {
  services: BoostServices;
  part: IndexManagementPart;
  /** The index or data stream. */
  name: string;
  /** An index's data stream, when it's a backing index, whose boost applies to it. */
  dataStream?: string;
  /** Closes a part that opens over Index Management, such as a flyout. */
  onClose?: () => void;
  /** The flyout history a flyout opens in, on top of the Index Management flyout that opened it. */
  historyKey?: symbol;
}

// Index Management renders each part on its own, so they share one client, and with it each request.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

const Part = ({
  part,
  name,
  dataStream,
  onClose,
  historyKey,
}: Omit<IndexManagementPartProps, 'services'>) => {
  switch (part) {
    case 'cardRule':
      return <CardRule indexName={name} />;
    case 'cardActions':
      return <CardActions indexName={name} />;
    case 'cardProfile':
      return <CardProfile indexName={name} />;
    case 'tab':
      return <BoostIndexDetails indexName={name} dataStream={dataStream} />;
    case 'dataStream':
      return <DataStreamBoostDetail dataStreamName={name} />;
    case 'dataStreamEditRule':
      return (
        <EditDataStreamRule
          dataStreamName={name}
          historyKey={historyKey}
          onClose={onClose ?? (() => {})}
        />
      );
  }
};

/** One part of an index's or data stream's boost, with the boost app's services and data. */
export const IndexManagementPartView = ({ services, ...props }: IndexManagementPartProps) => (
  <KibanaContextProvider services={services}>
    <QueryClientProvider client={queryClient}>
      <Part {...props} />
    </QueryClientProvider>
  </KibanaContextProvider>
);
