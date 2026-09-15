/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet, SignificantItem } from '@kbn/ml-agg-utils';

import type { SimpleHierarchicalTreeNode } from '../types';
import {
  buildSimpleHierarchicalTreeIndexes,
  type SimpleHierarchicalTreeBuildIndexes,
} from './build_simple_hierarchical_tree_indexes';
import { getFieldValuePairKey } from './get_field_value_pair_key';
import { getItemSetIndexesIntersection } from './get_item_set_indexes_intersection';
import { getValueCountsForField } from './get_value_counts_for_field';
import { getValuesDescendingFromValueCounts } from './get_values_descending';

function NewNodeFactory(name: string): SimpleHierarchicalTreeNode {
  const children: SimpleHierarchicalTreeNode[] = [];

  const addNode = (node: SimpleHierarchicalTreeNode) => {
    children.push(node);
  };

  return {
    name,
    set: [],
    docCount: 0,
    pValue: 0,
    children,
    addNode,
  };
}

/**
 * Simple function that constructs a tree from an itemset DataFrame sorted by support (count)
 * The resulting tree components are non-overlapping subsets of the data.
 * In summary, we start with the most inclusive itemset (highest count), and perform a depth first search in field order.
 *
 * @param significantItems
 * @param fields
 * @param displayParent
 * @param parentDocCount
 * @param parentLabel
 * @param field
 * @param value
 * @param iss
 * @param collapseRedundant
 * @param displayOther
 * @returns
 */
function dfDepthFirstSearch(
  itemSets: ItemSet[],
  treeBuildIndexes: SimpleHierarchicalTreeBuildIndexes,
  fields: string[],
  displayParent: SimpleHierarchicalTreeNode,
  parentDocCount: number,
  parentLabel: string,
  fieldIndex: number,
  value: string,
  itemSetIndexesSubset: number[],
  collapseRedundant: boolean,
  displayOther: boolean
) {
  const field = fields[fieldIndex];
  const pairKey = getFieldValuePairKey(field, value);
  const itemSetIndexes = treeBuildIndexes.itemSetIndexesByPairKey.get(pairKey);
  if (itemSetIndexes === undefined) {
    return 0;
  }

  const filteredItemSetIndexes = getItemSetIndexesIntersection(
    itemSetIndexesSubset,
    itemSetIndexes
  );
  if (filteredItemSetIndexes.length === 0) {
    return 0;
  }

  let docCount = 0;
  let pValue = 0;
  let totalDocCount = 0;
  for (const itemSetIndex of filteredItemSetIndexes) {
    const itemSet = itemSets[itemSetIndex];
    docCount = Math.max(docCount, itemSet.doc_count);
    pValue = Math.max(pValue, itemSet.maxPValue ?? 0);
    totalDocCount = Math.max(totalDocCount, itemSet.total_doc_count);
  }

  let label = `${parentLabel} ${value}`;

  let displayNode: SimpleHierarchicalTreeNode;

  const significantItem = treeBuildIndexes.significantItemByPairKey.get(pairKey);
  if (!significantItem) {
    return 0;
  }

  if (parentDocCount === docCount && collapseRedundant) {
    // collapse identical paths
    displayParent.name += ` ${value}`;

    displayParent.set.push({
      key: significantItem.key,
      type: significantItem.type,
      fieldName: field,
      fieldValue: value,
      docCount,
      pValue,
    });
    displayParent.docCount = docCount;
    displayParent.pValue = pValue;
    displayNode = displayParent;
  } else {
    displayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
    displayNode.set = [...displayParent.set];
    displayNode.set.push({
      key: significantItem.key,
      type: significantItem.type,
      fieldName: field,
      fieldValue: value,
      docCount,
      pValue,
    });
    displayNode.docCount = docCount;
    displayNode.pValue = pValue;
    displayParent.addNode(displayNode);
  }

  let nextField: string;
  let nextFieldValueCounts: Record<string, number> = {};
  let nextFieldIndex = fieldIndex + 1;
  while (true) {
    if (nextFieldIndex >= fields.length) {
      return docCount;
    }
    nextField = fields[nextFieldIndex];

    // TODO - add handling of creating * as next level of tree

    nextFieldValueCounts = getValueCountsForField(
      itemSets,
      filteredItemSetIndexes,
      nextField,
      treeBuildIndexes
    );
    if (Object.keys(nextFieldValueCounts).length > 0) {
      break;
    } else {
      nextFieldIndex += 1;
      if (collapseRedundant) {
        // add dummy node label
        displayNode.name += ` '*'`;
        label += ` '*'`;
        const nextDisplayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
        nextDisplayNode.set = displayNode.set;
        nextDisplayNode.docCount = docCount;
        nextDisplayNode.pValue = pValue;
        displayNode.addNode(nextDisplayNode);
        displayNode = nextDisplayNode;
      }
    }
  }

  let subCount = 0;
  for (const nextValue of getValuesDescendingFromValueCounts(nextFieldValueCounts)) {
    subCount += dfDepthFirstSearch(
      itemSets,
      treeBuildIndexes,
      fields,
      displayNode,
      docCount,
      label,
      nextFieldIndex,
      nextValue,
      filteredItemSetIndexes,
      collapseRedundant,
      displayOther
    );
  }

  if (displayOther) {
    if (subCount < docCount) {
      displayNode.addNode(
        NewNodeFactory(`${docCount - subCount}/${totalDocCount}${parentLabel} '{value}' 'OTHER`)
      );
    }
  }

  return docCount;
}

/**
 * Create simple tree consisting of non-overlapping sets of data.
 *
 * By default (fields==None), the field search order is dependent on the highest count itemsets.
 */
export function getSimpleHierarchicalTree(
  itemSets: ItemSet[],
  collapseRedundant: boolean,
  displayOther: boolean,
  significantItems: SignificantItem[],
  fields: string[] = []
) {
  const totalDocCount = Math.max(...itemSets.map((d) => d.total_doc_count));

  const newRoot = NewNodeFactory('');
  const treeBuildIndexes = buildSimpleHierarchicalTreeIndexes(itemSets, significantItems);

  const allItemSetIndexes = itemSets.map((_, index) => index);

  for (const [fieldIndex, field] of fields.entries()) {
    const rootFieldValueCounts = getValueCountsForField(
      itemSets,
      allItemSetIndexes,
      field,
      treeBuildIndexes
    );

    for (const value of getValuesDescendingFromValueCounts(rootFieldValueCounts)) {
      dfDepthFirstSearch(
        itemSets,
        treeBuildIndexes,
        fields,
        newRoot,
        totalDocCount + 1,
        '',
        fieldIndex,
        value,
        allItemSetIndexes,
        collapseRedundant,
        displayOther
      );
    }
  }

  return { root: newRoot, fields };
}
