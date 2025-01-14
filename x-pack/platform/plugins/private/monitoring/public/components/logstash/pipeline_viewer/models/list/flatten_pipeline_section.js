/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function flattenPipelineSection(pipelineSection, depth = 0, parentId = null) {
  const list = [];

  pipelineSection.forEach((statement) => {
    list.push(...statement.toList(depth, parentId));
  });

  return list;
}
