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
  custom: T;

  serviceColor?: string;

  id: string;

  parent?: IWaterfallItem;
  parentId?: string;

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

export type IWaterfallTransaction = IWaterfallItemBase<
  Transaction,
  'transaction'
>;
export type IWaterfallSpan = IWaterfallItemBase<Span, 'span'>;
export type IWaterfallError = IWaterfallItemBase<APMError, 'error'>;

export type IWaterfallItem =
  | IWaterfallTransaction
  | IWaterfallSpan
  | IWaterfallError;

function getTransactionItem(transaction: Transaction): IWaterfallTransaction {
  return {
    docType: 'transaction',
    custom: transaction,
    id: transaction.transaction.id,
    parentId: transaction.parent?.id,
    duration: transaction.transaction.duration.us,
    offset: 0,
    skew: 0
  };
}

function getSpanItem(span: Span): IWaterfallSpan {
  return {
    docType: 'span',
    custom: span,
    id: span.span.id,
    parentId: span.parent?.id,
    duration: span.span.duration.us,
    offset: 0,
    skew: 0
  };
}

function getErrorItem(error: APMError): IWaterfallError {
  return {
    docType: 'error',
    custom: error,
    id: error.error.id,
    parentId: error.parent?.id,
    offset: 0,
    skew: 0,
    duration: 0
  };
}

export function getClockSkew(
  item: IWaterfallItem,
  parentItem?: IWaterfallItem
) {
  // parent should never be a type of agentMark
  if (!parentItem) {
    return 0;
  }
  switch (item.docType) {
    // don't calculate skew for spans and errors. Just use parent's skew
    case 'error':
    case 'span':
      return parentItem.skew;
    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.custom.timestamp.us + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.custom.timestamp.us;
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
  const entryTimestamp = entryWaterfallTransaction.custom.timestamp.us;
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
      'custom.timestamp.us'
    );

    item.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.custom.timestamp.us - entryTimestamp;
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
    return item.custom;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(waterfallItems: IWaterfallItem[]) {
  const services = uniq(waterfallItems.map(item => item.custom.service.name));

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

const getWaterfallItems = (items: TraceAPIResponse['trace']['items']) =>
  items.map(item => {
    const docType = item.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(item as Span);
      case 'transaction':
        return getTransactionItem(item as Transaction);
      case 'error':
        return getErrorItem(item as APMError);
    }
  });

const getChildrenGroupedByParentId = (waterfallItems: IWaterfallItem[]) =>
  groupBy(waterfallItems, item => (item.parentId ? item.parentId : 'root'));

const getEntryWaterfallTransaction = (
  entryTransactionId: string,
  waterfallItems: IWaterfallItem[]
): IWaterfallTransaction | undefined =>
  waterfallItems.find(
    item => item.docType === 'transaction' && item.id === entryTransactionId
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

  const waterfallItems: IWaterfallItem[] = getWaterfallItems(trace.items);

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

  const entryTransaction = entryWaterfallTransaction?.custom;

  const waterfallErrors = items.filter(
    item => item.docType === 'error'
  ) as IWaterfallError[];

  // Add the service color into the error waterfall item
  waterfallErrors.map(error => {
    error.serviceColor = serviceColors[error.custom.service.name];
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
