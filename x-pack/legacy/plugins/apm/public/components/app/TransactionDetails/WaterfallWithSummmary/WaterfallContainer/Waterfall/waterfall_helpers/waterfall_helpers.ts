/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  first,
  flatten,
  groupBy,
  isEmpty,
  sortBy,
  uniq,
  zipObject
} from 'lodash';
import { TraceAPIResponse } from '../../../../../../../../server/lib/traces/get_trace';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';

interface IWaterfallGroup {
  [key: string]: IWaterfallItem[];
}

export interface IWaterfall {
  /**
   * Duration in us
   */
  duration: number;
  serviceColors: IServiceColors;
  entryTransaction?: Transaction;
  rootTransaction?: Transaction;
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction'];
  items: IWaterfallItem[];
  getTransactionById: (id?: IWaterfallItem['id']) => Transaction | undefined;
}

interface IWaterfallItemBase {
  id: string | number;
  parentId?: string;
  serviceName: string;
  name: string;

  /**
   * Duration in us
   */
  duration: number;

  /**
   * start timestamp in us
   */
  timestamp: number;

  /**
   * offset from first item in us
   */
  offset: number;

  /**
   * skew from timestamp in us
   */
  skew: number;
  childIds?: Array<IWaterfallItemBase['id']>;
}

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
  errorCount: number;
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  span: Span;
  docType: 'span';
}

export type IWaterfallItem = IWaterfallItemSpan | IWaterfallItemTransaction;

function getTransactionItem(
  transaction: Transaction,
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
): IWaterfallItemTransaction {
  return {
    id: transaction.transaction.id,
    parentId: transaction.parent?.id,
    serviceName: transaction.service.name,
    name: transaction.transaction.name,
    duration: transaction.transaction.duration.us,
    timestamp: transaction.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'transaction',
    transaction,
    errorCount:
      errorsPerTransaction[transaction.transaction.id]?.doc_count || 0,
    errorTimestamp:
      errorsPerTransaction[transaction.transaction.id]?.error.timestamp.us
  };
}

function getSpanItem(span: Span): IWaterfallItemSpan {
  return {
    id: span.span.id,
    parentId: span.parent?.id,
    serviceName: span.service.name,
    name: span.span.name,
    duration: span.span.duration.us,
    timestamp: span.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'span',
    span
  };
}

export function getClockSkew(
  item: IWaterfallItem,
  parentItem?: IWaterfallItem
) {
  if (!parentItem) {
    return 0;
  }

  switch (item.docType) {
    // don't calculate skew for spans. Just use parent's skew
    case 'span':
      return parentItem.skew;

    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.timestamp + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.timestamp;
      if (offsetStart > 0) {
        const latency = Math.max(parentItem.duration - item.duration, 0) / 2;
        return offsetStart + latency;
      }

      // child transaction starts after parent thus no adjustment is needed
      return 0;
    }
  }
}

export function sortWaterfallByParentId(
  childrenByParentId: IWaterfallGroup,
  entryWaterfallTransaction?: IWaterfallItem
) {
  if (!entryWaterfallTransaction) {
    return [];
  }
  const visitedWaterfallItemSet = new Set();
  function getSortedChildren(
    item: IWaterfallItem,
    parentItem?: IWaterfallItem
  ): IWaterfallItem[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);
    const children = sortBy(childrenByParentId[item.id] || [], 'timestamp');

    item.childIds = children.map(child => child.id);
    const entryTransactionTimestamp = entryWaterfallTransaction?.timestamp || 0;
    item.offset = item.timestamp - entryTransactionTimestamp;
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(
      children.map(child => getSortedChildren(child, item))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryWaterfallTransaction);
}

function getRootTransaction(childrenByParentId: IWaterfallGroup) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item.transaction;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(items: IWaterfallItem[]) {
  const services = uniq(items.map(item => item.serviceName));
  const assignedColors = [
    theme.euiColorVis1,
    theme.euiColorVis0,
    theme.euiColorVis3,
    theme.euiColorVis2,
    theme.euiColorVis6,
    theme.euiColorVis7,
    theme.euiColorVis5
  ];

  return zipObject(services, assignedColors) as IServiceColors;
}

function getWaterfallDuration(items: IWaterfallItem[]) {
  if (items.length === 0) {
    return 0;
  }
  const timestampStart = items[0].timestamp;
  const timestampEnd = Math.max(
    ...items.map(item => item.timestamp + item.duration + item.skew)
  );
  return timestampEnd - timestampStart;
}

const transformTraceItems = ({
  trace,
  errorsPerTransaction
}: TraceAPIResponse) =>
  trace.items.map(traceItem => {
    const docType = traceItem.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(traceItem as Span);
      case 'transaction':
        return getTransactionItem(
          traceItem as Transaction,
          errorsPerTransaction
        );
    }
  });

const findWaterfallTransactionById = (
  waterfallItems: Array<IWaterfallItemSpan | IWaterfallItemTransaction>,
  id?: IWaterfallItem['id']
): IWaterfallItemTransaction | undefined =>
  waterfallItems.find(
    waterfallItem =>
      waterfallItem.docType === 'transaction' && waterfallItem.id === id
  ) as IWaterfallItemTransaction;

export function getWaterfall(
  { trace, errorsPerTransaction }: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(trace.items) || !entryTransactionId) {
    return {
      serviceColors: {},
      duration: 0,
      errorsPerTransaction,
      items: [],
      getTransactionById: () => undefined
    };
  }

  const waterfallItems = transformTraceItems({ trace, errorsPerTransaction });

  const entryWaterfallTransaction = findWaterfallTransactionById(
    waterfallItems,
    entryTransactionId
  );

  const childrenByParentId = groupBy(waterfallItems, item =>
    item.parentId ? item.parentId : 'root'
  );

  const rootTransaction = getRootTransaction(childrenByParentId);

  const items = sortWaterfallByParentId(
    childrenByParentId,
    entryWaterfallTransaction
  );

  const getTransactionById = (id?: IWaterfallItem['id']) =>
    findWaterfallTransactionById(waterfallItems, id)?.transaction;

  const errorsTimeline = Object.values(errorsPerTransaction)
    .map(e => {
      return e.error.timestamp.us;
    })
    .sort();

  return {
    duration: getWaterfallDuration(items),
    serviceColors: getServiceColors(items),
    entryTransaction: entryWaterfallTransaction?.transaction,
    rootTransaction,
    errorsPerTransaction,
    items,
    getTransactionById,
    errorsTimeline
  };
}
