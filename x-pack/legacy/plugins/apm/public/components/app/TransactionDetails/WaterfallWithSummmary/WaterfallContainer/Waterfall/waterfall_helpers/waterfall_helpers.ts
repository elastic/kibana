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
}

interface IWaterfallItemBase {
  parent?: IWaterfallItem;
  id: string;

  /**
   * offset from first item in us
   */
  offset: number;

  /**
   * skew from timestamp in us
   */
  skew: number;
}

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  trace: Transaction; // TODO: check this name
  docType: 'transaction';
  errorCount: number;
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  trace: Span; // TODO: check this name
  docType: 'span';
}

export type IWaterfallItem = IWaterfallItemSpan | IWaterfallItemTransaction;

function getTransactionItem(
  transaction: Transaction,
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
): IWaterfallItemTransaction {
  return {
    id: transaction.transaction.id,
    offset: 0,
    skew: 0,
    docType: 'transaction',
    trace: transaction,
    errorCount:
      errorsPerTransaction[transaction.transaction.id]?.doc_count || 0,
    errorTimestamp:
      errorsPerTransaction[transaction.transaction.id]?.error.timestamp.us
  };
}

function getSpanItem(span: Span): IWaterfallItemSpan {
  return {
    id: span.span.id,
    offset: 0,
    skew: 0,
    docType: 'span',
    trace: span
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
      const parentStart = parentItem.trace.timestamp.us + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.trace.timestamp.us;
      if (offsetStart > 0) {
        const parentDuration =
          parentItem.docType === 'span'
            ? parentItem.trace.span.duration.us
            : parentItem.trace.transaction.duration.us;

        const latency =
          Math.max(parentDuration - item.trace.transaction.duration.us, 0) / 2;
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
  const entryTransactionTimestamp =
    entryWaterfallTransaction?.trace.timestamp.us || 0;

  const visitedWaterfallItemSet = new Set();
  function getSortedChildren(
    item: IWaterfallItem,
    parentItem?: IWaterfallItem
  ): IWaterfallItem[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);
    const children = sortBy(
      childrenByParentId[item.id] || [],
      'trace.timestamp.us'
    );

    item.offset = item.trace.timestamp.us - entryTransactionTimestamp;
    item.skew = getClockSkew(item, parentItem);
    item.parent = parentItem;

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
    return item.trace;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(items: IWaterfallItem[]) {
  const services = uniq(items.map(item => item.trace.service.name));
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
  const timestampStart = items[0].trace.timestamp.us;

  const timestampEnd = Math.max(
    ...items.map(item => {
      const duration =
        item.docType === 'span'
          ? item.trace.span.duration.us
          : item.trace.transaction.duration.us;
      return item.trace.timestamp.us + duration + item.skew;
    })
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
      items: []
    };
  }

  const waterfallItems = transformTraceItems({ trace, errorsPerTransaction });

  const entryWaterfallTransaction = findWaterfallTransactionById(
    waterfallItems,
    entryTransactionId
  );

  const childrenByParentId = groupBy(waterfallItems, item =>
    item.trace.parent?.id ? item.trace.parent?.id : 'root'
  );

  const rootTransaction = getRootTransaction(childrenByParentId);

  const items = sortWaterfallByParentId(
    childrenByParentId,
    entryWaterfallTransaction
  );

  const errorsTimeline = Object.values(errorsPerTransaction)
    .map(e => {
      return e.error.timestamp.us;
    })
    .sort();

  return {
    duration: getWaterfallDuration(items),
    serviceColors: getServiceColors(items),
    entryTransaction: entryWaterfallTransaction?.trace,
    rootTransaction,
    errorsPerTransaction,
    items,
    errorsTimeline
  };
}
