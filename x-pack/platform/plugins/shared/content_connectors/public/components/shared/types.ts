/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ItemWithAnID = {
  id: number | string | null;
  created_at?: string;
} & object;

export interface DraggableUXStyles {
  alignItems?: string;
  flexBasis?: string;
  flexGrow?: number;
}
export interface Column<Item> extends DraggableUXStyles {
  name?: string;
  render: (item: Item) => React.ReactNode;
}
