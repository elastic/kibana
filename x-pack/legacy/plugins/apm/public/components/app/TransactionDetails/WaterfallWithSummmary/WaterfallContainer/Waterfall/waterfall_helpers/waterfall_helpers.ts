/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  flatten,
  groupBy,
  indexBy,
  sortBy,
  uniq,
  zipObject,
  isEmpty,
  first,
  sum
} from 'lodash';
import { TraceAPIResponse } from '../../../../../../../../server/lib/traces/get_trace';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../../../../../typings/es_schemas/ui/APMError';

interface IWaterfallIndex {
  [key: string]: IWaterfallItem | undefined;
}

interface IWaterfallGroup {
  [key: string]: IWaterfallItem[];
}

export interface IWaterfall {
  entryTransaction?: Transaction;
  traceRoot?: Transaction;
  traceRootDuration?: number;

  /**
   * Duration in us
   */
  duration: number;
  orderedItems: IWaterfallItem[];
  itemsById: IWaterfallIndex;
  getTransactionById: (id?: IWaterfallItem['id']) => Transaction | undefined;
  errorCountByTransactionId: TraceAPIResponse['errorsPerTransaction'];
  errorCount: number;
  serviceColors: IServiceColors;
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

export interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
  errorCount: number;
}

export interface IWaterfallItemSpan extends IWaterfallItemBase {
  span: Span;
  docType: 'span';
}

export interface IWaterfallItemAgentMark extends IWaterfallItemBase {
  docType: 'agentMark';
}

export interface IWaterfallItemError extends Omit<IWaterfallItemBase, 'name'> {
  error: APMError;
  docType: 'error';
  message?: string;
  serviceColor?: string;
}

export type IWaterfallItem =
  | IWaterfallItemSpan
  | IWaterfallItemTransaction
  | IWaterfallItemError
  | IWaterfallItemAgentMark;

function getTransactionItem(
  transaction: Transaction,
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
): IWaterfallItemTransaction {
  return {
    id: transaction.transaction.id,
    parentId: transaction.parent && transaction.parent.id,
    serviceName: transaction.service.name,
    name: transaction.transaction.name,
    duration: transaction.transaction.duration.us,
    timestamp: transaction.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'transaction',
    transaction,
    errorCount: errorsPerTransaction[transaction.transaction.id] || 0
  };
}

function getSpanItem(span: Span): IWaterfallItemSpan {
  return {
    id: span.span.id,
    parentId: span.parent && span.parent.id,
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

function getErrorItem(error: APMError): IWaterfallItemError {
  return {
    id: error.error.id,
    parentId: error.parent?.id,
    serviceName: error.service.name,
    message: error.error.log?.message || error.error.exception?.[0]?.message,
    timestamp: error.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'error',
    error,
    duration: 0
  };
}

function getAgentMarks(transaction?: Transaction): IWaterfallItemAgentMark[] {
  const agent = transaction?.transaction.marks?.agent;
  if (!agent) {
    return [];
  }
  return Object.entries(agent).map(
    ([name, ms]) =>
      ({
        id: name,
        name,
        offset: ms * 1000,
        docType: 'agentMark'
      } as IWaterfallItemAgentMark)
  );
}

export function getClockSkew(
  item: IWaterfallItem,
  parentItem?: IWaterfallItem
) {
  if (!parentItem) {
    return 0;
  }

  switch (item.docType) {
    // don't calculate skew for spans and error. Just use parent's skew
    case 'error':
    case 'span':
      return parentItem.skew;
    // agentMark doesnt have parent-child relationship, no adjustment is needed
    case 'agentMark':
      return 0;

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

export function getOrderedWaterfallItems(
  childrenByParentId: IWaterfallGroup,
  entryTransactionItem: IWaterfallItem
) {
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
    // get offset from the beginning of trace
    item.offset = item.timestamp - entryTransactionItem.timestamp;
    // move the item to the right if it starts before its parent
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(
      children.map(child => getSortedChildren(child, item))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryTransactionItem);
}

function getRootTransaction(childrenByParentId: IWaterfallGroup) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item.transaction;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(items: IWaterfallItem[]) {
  const services = uniq(
    items
      .filter(item => item.docType !== 'agentMark')
      .map(item => item.serviceName)
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

const getTraceDuration = (items: IWaterfallItem[]) =>
  Math.max(...items.map(item => item.offset + item.skew + item.duration), 0);

function createGetTransactionById(itemsById: IWaterfallIndex) {
  return (id?: IWaterfallItem['id']) => {
    if (!id) {
      return undefined;
    }

    const item = itemsById[id];
    const isTransaction = item?.docType === 'transaction';
    if (isTransaction) {
      return (item as IWaterfallItemTransaction).transaction;
    }
  };
}

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
  groupBy(waterfallItems, item => (item.parentId ? item.parentId : 'root'));

const getEntryWaterfallTransaction = (
  entryTransactionId: string,
  waterfallItems: IWaterfallItem[]
) =>
  waterfallItems.find(
    waterfallItem =>
      waterfallItem.docType === 'transaction' &&
      waterfallItem.id === entryTransactionId
  ) as IWaterfallItemTransaction;

export function getWaterfall(
  { trace, errorsPerTransaction }: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(trace.items) || !entryTransactionId) {
    return {
      duration: 0,
      orderedItems: [],
      itemsById: {},
      getTransactionById: () => undefined,
      errorCountByTransactionId: errorsPerTransaction,
      errorCount: sum(Object.values(errorsPerTransaction)),
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

  const entryTransaction = entryWaterfallTransaction?.transaction;

  const orderedItems = entryWaterfallTransaction
    ? getOrderedWaterfallItems(childrenByParentId, entryWaterfallTransaction)
    : [];

  const traceRoot = getRootTransaction(childrenByParentId);
  const duration = getTraceDuration(orderedItems);
  const traceRootDuration = traceRoot && traceRoot.transaction.duration.us;
  const serviceColors = getServiceColors(orderedItems);

  // the agentMarks should be added direct inside orderedItems, as it doesnt have parent-child relationship
  orderedItems.push(...getAgentMarks(entryTransaction));

  const itemsById: IWaterfallIndex = indexBy(waterfallItems, 'id');
  const getTransactionById = createGetTransactionById(itemsById);

  // Add the service color into the error waterfall item
  const waterfallErrors = orderedItems.filter(
    item => item.docType === 'error'
  ) as IWaterfallItemError[];

  waterfallErrors.map(error => {
    error.serviceColor = serviceColors[error.serviceName];
    return error;
  });

  return {
    entryTransaction,
    traceRoot,
    traceRootDuration,
    duration,
    orderedItems,
    itemsById,
    getTransactionById,
    errorCountByTransactionId: errorsPerTransaction,
    errorCount: waterfallErrors.length,
    serviceColors
  };
}
