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

const ROOT_ID = 'root';

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
  errorItems: IWaterfallError[];
}

interface IWaterfallItemBase<T, U> {
  docType: U;
  doc: T;

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

export type IWaterfallItem = IWaterfallTransaction | IWaterfallSpan;

function getTransactionItem(transaction: Transaction): IWaterfallTransaction {
  return {
    docType: 'transaction',
    doc: transaction,
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
    doc: span,
    id: span.span.id,
    parentId: span.parent?.id,
    duration: span.span.duration.us,
    offset: 0,
    skew: 0
  };
}

function getErrorItem(
  error: APMError,
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
): IWaterfallError {
  const entryTimestamp = entryWaterfallTransaction?.doc.timestamp.us ?? 0;
  const parent = items.find(
    waterfallItem => waterfallItem.id === error.parent?.id
  );
  const errorItem: IWaterfallError = {
    docType: 'error',
    doc: error,
    id: error.error.id,
    parent,
    parentId: parent?.id,
    offset: error.timestamp.us - entryTimestamp,
    skew: 0,
    duration: 0
  };

  return {
    ...errorItem,
    skew: getClockSkew(errorItem, parent)
  };
}

export function getClockSkew(
  item: IWaterfallItem | IWaterfallError,
  parentItem?: IWaterfallItem
) {
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
      const parentStart = parentItem.doc.timestamp.us + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.doc.timestamp.us;
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
  const entryTimestamp = entryWaterfallTransaction.doc.timestamp.us;
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
      'doc.timestamp.us'
    );

    item.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.doc.timestamp.us - entryTimestamp;
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
    return item.doc;
  }
}

export type IServiceColors = Record<string, string>;

function getServiceColors(waterfallItems: IWaterfallItem[]) {
  const services = uniq(waterfallItems.map(item => item.doc.service.name));

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
    }
  });

const getChildrenGroupedByParentId = (waterfallItems: IWaterfallItem[]) =>
  groupBy(waterfallItems, item => (item.parentId ? item.parentId : ROOT_ID));

const getEntryWaterfallTransaction = (
  entryTransactionId: string,
  waterfallItems: IWaterfallItem[]
): IWaterfallTransaction | undefined =>
  waterfallItems.find(
    item => item.docType === 'transaction' && item.id === entryTransactionId
  ) as IWaterfallTransaction;

function isInEntryTransaction(
  parentIdLookup: Map<string, string>,
  entryTransactionId: string,
  currentId: string
): boolean {
  if (currentId === entryTransactionId) {
    return true;
  }
  const parentId = parentIdLookup.get(currentId);
  if (parentId) {
    return isInEntryTransaction(parentIdLookup, entryTransactionId, parentId);
  }
  return false;
}

function getWaterfallErrors(
  errorDocs: TraceAPIResponse['trace']['errorDocs'],
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  const errorItems = errorDocs.map(errorDoc =>
    getErrorItem(errorDoc, items, entryWaterfallTransaction)
  );
  if (!entryWaterfallTransaction) {
    return errorItems;
  }
  const parentIdLookup = [...items, ...errorItems].reduce(
    (map, { id, parentId }) => {
      map.set(id, parentId ?? ROOT_ID);
      return map;
    },
    new Map<string, string>()
  );
  return errorItems.filter(errorItem =>
    isInEntryTransaction(
      parentIdLookup,
      entryWaterfallTransaction?.id,
      errorItem.id
    )
  );
}

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
      serviceColors: {},
      errorItems: []
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
  const errorItems = getWaterfallErrors(
    trace.errorDocs,
    items,
    entryWaterfallTransaction
  );

  const rootTransaction = getRootTransaction(childrenByParentId);
  const duration = getWaterfallDuration(items);
  const serviceColors = getServiceColors(items);

  const entryTransaction = entryWaterfallTransaction?.doc;

  return {
    entryTransaction,
    rootTransaction,
    duration,
    items,
    errorsPerTransaction,
    errorsCount: errorItems.length,
    serviceColors,
    errorItems
  };
}
