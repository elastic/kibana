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
  first
} from 'lodash';
import { TraceAPIResponse } from '../../../../../../../../server/lib/traces/get_trace';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../../../../../typings/es_schemas/ui/APMError';

interface IWaterfallIndex {
  [key: string]: IWaterfallItem | undefined;
}

interface IWaterfallGroup {
  [key: string]: IWaterfallTraceItem[];
}

export interface IWaterfall {
  entryTransaction?: Transaction;
  traceRoot?: Transaction;
  traceRootDuration?: number;

  /**
   * Duration in us
   */
  duration: number;
  services: string[];
  orderedItems: IWaterfallItem[];
  itemsById: IWaterfallIndex;
  getTransactionById: (id?: IWaterfallItem['id']) => Transaction | undefined;
  errorCountByTransactionId: TraceAPIResponse['errorsPerTransaction'];
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

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
  errorCount: number;
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  span: Span;
  docType: 'span';
}

export interface IWaterfallItemAgentMark
  extends Pick<IWaterfallItemBase, 'id' | 'name' | 'offset'> {
  docType: 'agentMark';
}

export interface IWaterfallItemError extends Omit<IWaterfallItemBase, 'name'> {
  error: APMError;
  docType: 'error';
  message?: string;
  serviceColor?: string;
}

type IWaterfallTraceItem =
  | IWaterfallItemSpan
  | IWaterfallItemTransaction
  | IWaterfallItemError;

export type IWaterfallItem = IWaterfallTraceItem | IWaterfallItemAgentMark;

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
  if (
    !(
      transaction &&
      transaction.transaction.marks &&
      transaction.transaction.marks.agent
    )
  ) {
    return [];
  }
  return Object.entries(transaction.transaction.marks.agent).map(
    ([name, ms]) => ({
      id: name,
      name,
      offset: ms * 1000,
      docType: 'agentMark'
    })
  );
}

export function getClockSkew(
  item: IWaterfallTraceItem,
  parentItem?: IWaterfallTraceItem
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
    case 'error':
      return parentItem.skew;
  }
}

export function getOrderedWaterfallItems(
  childrenByParentId: IWaterfallGroup,
  entryTransactionItem: IWaterfallTraceItem
) {
  const visitedWaterfallItemSet = new Set();
  function getSortedChildren(
    item: IWaterfallTraceItem,
    parentItem?: IWaterfallTraceItem
  ): IWaterfallItem[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);
    const children = sortBy(childrenByParentId[item.id] || [], 'timestamp');

    item.childIds = children.map(child => child.id);
    // get offset from the beginning of trace
    item.offset = item.timestamp - entryTransactionItem.timestamp;
    // get skew when the child starts before the parent, take latency into account
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(
      children.map(child => getSortedChildren(child, item))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryTransactionItem);
}

function getTraceRoot(childrenByParentId: IWaterfallGroup) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item.transaction;
  }
}

function getServices(items: IWaterfallItem[]) {
  const serviceNames = (items.filter(
    item => item.docType !== 'agentMark'
  ) as IWaterfallTraceItem[]).map(item => item.serviceName);

  return uniq(serviceNames);
}

export type IServiceColors = Record<string, string>;

function getServiceColors(services: string[]) {
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

function getDuration(items: IWaterfallItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const traceItems = items.filter(
    item => item.docType !== 'agentMark' && item.docType !== 'error'
  ) as IWaterfallTraceItem[];

  const timestampStart = traceItems[0].timestamp;
  const timestampEnd = Math.max(
    ...traceItems.map(item => item.timestamp + item.duration + item.skew)
  );
  return timestampEnd - timestampStart;
}

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

export function getWaterfall(
  { trace, errorsPerTransaction }: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(trace.items) || !entryTransactionId) {
    return {
      services: [],
      duration: 0,
      orderedItems: [],
      itemsById: {},
      getTransactionById: () => undefined,
      errorCountByTransactionId: errorsPerTransaction,
      serviceColors: {}
    };
  }

  const waterfallItems: IWaterfallTraceItem[] = trace.items.map(traceItem => {
    const docType = traceItem.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(traceItem as Span);
      case 'transaction':
        return getTransactionItem(
          traceItem as Transaction,
          errorsPerTransaction
        );
      case 'error':
        return getErrorItem(traceItem as APMError);
    }
  });

  const itemsById: IWaterfallIndex = indexBy(waterfallItems, 'id');
  const getTransactionById = createGetTransactionById(itemsById);
  const entryTransaction = getTransactionById(entryTransactionId);

  const childrenByParentId = groupBy(waterfallItems, item =>
    item.parentId ? item.parentId : 'root'
  );
  const entryTransactionItem = waterfallItems.find(
    waterfallItem =>
      waterfallItem.docType === 'transaction' &&
      waterfallItem.id === entryTransactionId
  );
  const orderedItems = entryTransactionItem
    ? getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
    : [];

  const traceRoot = getTraceRoot(childrenByParentId);
  const duration = getDuration(orderedItems);
  const traceRootDuration = traceRoot && traceRoot.transaction.duration.us;
  const services = getServices(orderedItems);
  const serviceColors = getServiceColors(services);

  const agentMarks = getAgentMarks(entryTransaction);
  orderedItems.push(...agentMarks);

  orderedItems
    .filter(item => item.docType === 'error')
    .map(item => {
      const error = item as IWaterfallItemError;
      error.serviceColor = serviceColors[error.serviceName];
      return error;
    });

  return {
    entryTransaction,
    traceRoot,
    traceRootDuration,
    duration,
    services,
    orderedItems,
    itemsById,
    getTransactionById,
    errorCountByTransactionId: errorsPerTransaction,
    serviceColors
  };
}
