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
  sum,
  uniq,
  zipObject
} from 'lodash';
import { TraceAPIResponse } from '../../../../../../../../server/lib/traces/get_trace';
import { APMError } from '../../../../../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';

interface IWaterfallGroup {
  [key: string]: IWaterfallItem[];
}

export interface IWaterfall {
  entryTransaction?: Transaction;
  rootTransaction?: Transaction;

  /**
   * Duration in us
   */
  duration: number;
  items: IWaterfallItem[];
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction'];
  errorsCount: number;
  serviceColors: IServiceColors;
}

interface IWaterfallItemBase<T, U> {
  docType: U;
  doc: T;

  /**
   * Duration in us
   */
  duration: number;

  /**
   * offset from first item in us
   */
  offset: number;

  /**
   * skew from timestamp in us
   */
  skew: number;
}

// Interface that represents properties shared between Transaction, Span and Error
interface ITraceItem {
  id: string;
  parentId?: string;
  parent?: IWaterfallItem;
  serviceName: string;
  /**
   * start timestamp in us
   */
  timestamp: number;
}

export interface ITransaction extends ITraceItem {
  transaction: Transaction;
  errorsCount: number;
  name: string;
}

export interface ISpan extends ITraceItem {
  span: Span;
  name: string;
}

interface IError extends ITraceItem {
  error: APMError;
  message?: string;
  serviceColor?: string;
}

interface IAgentMark {
  mark: string;
}

export type IWaterfallTransaction = IWaterfallItemBase<
  ITransaction,
  'transaction'
>;
export type IWaterfallSpan = IWaterfallItemBase<ISpan, 'span'>;
export type IWaterfallError = IWaterfallItemBase<IError, 'error'>;
export type IWaterfallAgentMark = IWaterfallItemBase<IAgentMark, 'agentMark'>;

export type IWaterfallItem =
  | IWaterfallTransaction
  | IWaterfallSpan
  | IWaterfallError
  | IWaterfallAgentMark;

function getTransactionItem(
  transaction: Transaction,
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
): IWaterfallTransaction {
  return {
    docType: 'transaction',
    doc: {
      id: transaction.transaction.id,
      transaction,
      errorsCount: errorsPerTransaction[transaction.transaction.id] || 0,
      parentId: transaction.parent?.id,
      serviceName: transaction.service.name,
      timestamp: transaction.timestamp.us,
      name: transaction.transaction.name
    },
    duration: transaction.transaction.duration.us,
    offset: 0,
    skew: 0
  };
}

function getSpanItem(span: Span): IWaterfallSpan {
  return {
    docType: 'span',
    doc: {
      id: span.span.id,
      span,
      parentId: span.parent?.id,
      serviceName: span.service.name,
      timestamp: span.timestamp.us,
      name: span.span.name
    },
    duration: span.span.duration.us,
    offset: 0,
    skew: 0
  };
}

function getErrorItem(error: APMError): IWaterfallError {
  return {
    docType: 'error',
    doc: {
      id: error.error.id,
      error,
      message: error.error.log?.message || error.error.exception?.[0]?.message,
      parentId: error.parent?.id,
      serviceName: error.service.name,
      timestamp: error.timestamp.us
    },
    offset: 0,
    skew: 0,
    duration: 0
  };
}

function getAgentMarks(transaction?: Transaction): IWaterfallAgentMark[] {
  const agent = transaction?.transaction.marks?.agent;
  if (!agent) {
    return [];
  }
  return Object.entries(agent).map(([name, ms]) => ({
    docType: 'agentMark',
    doc: {
      mark: name
    },
    offset: ms * 1000,
    duration: 0,
    skew: 0
  }));
}

export function getClockSkew(
  item: IWaterfallItem,
  parentItem?: IWaterfallItem
) {
  // parent should never be a type of agentMark
  if (!parentItem || parentItem.docType === 'agentMark') {
    return 0;
  }
  switch (item.docType) {
    // don't calculate skew for spans. Just use parent's skew
    case 'span':
      return parentItem.skew;
    // agentMark doesnt have parent-child relationship, no adjustment is needed
    case 'agentMark':
      return 0;
    // when an error happened before its parent, the skew has to be calculated with the parent skew and duration.
    // e.g.: An error with a parent that is the entry transaction and it doesnt have parent (skew = 0).
    case 'error':
    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.doc.timestamp + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.doc.timestamp;
      if (offsetStart > 0) {
        const latency = Math.max(parentItem.duration - item.duration, 0) / 2;
        return offsetStart + latency;
      }

      // child transaction starts after parent thus no adjustment is needed
      return 0;
    }
  }
}

export function getOrderedWaterfallItems(
  childrenByParentId: IWaterfallGroup,
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  if (!entryWaterfallTransaction) {
    return [];
  }
  const entryTimestamp = entryWaterfallTransaction.doc.timestamp;
  const visitedWaterfallItemSet = new Set();

  function getSortedChildren(
    item: IWaterfallItem,
    parentItem?: IWaterfallItem
  ): IWaterfallItem[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);

    if (item.docType === 'agentMark') {
      return [item];
    }

    const children = sortBy(
      childrenByParentId[item.doc.id] || [],
      'doc.timestamp'
    );

    item.doc.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.doc.timestamp - entryTimestamp;
    // move the item to the right if it starts before its parent
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
    return item.doc.transaction;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(waterfallItems: IWaterfallItem[]) {
  const services = uniq(
    (waterfallItems.filter(item => item.docType !== 'agentMark') as Array<
      Exclude<IWaterfallItem, IWaterfallAgentMark>
    >).map(item => item.doc.serviceName)
  );

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

const getWaterfallDuration = (waterfallItems: IWaterfallItem[]) =>
  Math.max(
    ...waterfallItems.map(item => item.offset + item.skew + item.duration),
    0
  );

const getWaterfallItems = (
  items: TraceAPIResponse['trace']['items'],
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
) =>
  items.map(item => {
    const docType = item.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(item as Span);
      case 'transaction':
        return getTransactionItem(item as Transaction, errorsPerTransaction);
      case 'error':
        return getErrorItem(item as APMError);
    }
  });

const getChildrenGroupedByParentId = (waterfallItems: IWaterfallItem[]) =>
  groupBy(
    waterfallItems.filter(item => item.docType !== 'agentMark') as Array<
      Exclude<IWaterfallItem, IWaterfallAgentMark>
    >,
    item => (item.doc.parentId ? item.doc.parentId : 'root')
  );

const getEntryWaterfallTransaction = (
  entryTransactionId: string,
  waterfallItems: IWaterfallItem[]
): IWaterfallTransaction | undefined =>
  waterfallItems.find(
    item => item.docType === 'transaction' && item.doc.id === entryTransactionId
  ) as IWaterfallTransaction;

export function getWaterfall(
  { trace, errorsPerTransaction }: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(trace.items) || !entryTransactionId) {
    return {
      duration: 0,
      items: [],
      errorsPerTransaction,
      errorsCount: sum(Object.values(errorsPerTransaction)),
      serviceColors: {}
    };
  }

  const waterfallItems: IWaterfallItem[] = getWaterfallItems(
    trace.items,
    errorsPerTransaction
  );

  const childrenByParentId = getChildrenGroupedByParentId(waterfallItems);

  const entryWaterfallTransaction = getEntryWaterfallTransaction(
    entryTransactionId,
    waterfallItems
  );

  const items = getOrderedWaterfallItems(
    childrenByParentId,
    entryWaterfallTransaction
  );

  const rootTransaction = getRootTransaction(childrenByParentId);
  const duration = getWaterfallDuration(items);
  const serviceColors = getServiceColors(items);

  const entryTransaction = entryWaterfallTransaction?.doc.transaction;
  // the agentMarks should be added direct inside items, as it doesnt have parent-child relationship
  items.push(...getAgentMarks(entryTransaction));

  const waterfallErrors = items.filter(
    item => item.docType === 'error'
  ) as IWaterfallError[];

  // Add the service color into the error waterfall item
  waterfallErrors.map(error => {
    error.doc.serviceColor = serviceColors[error.doc.serviceName];
    return error;
  });

  return {
    entryTransaction,
    rootTransaction,
    duration,
    items,
    errorsPerTransaction,
    errorsCount: waterfallErrors.length,
    serviceColors
  };
}
