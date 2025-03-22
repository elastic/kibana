/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Column, ItemWithAnID } from '../../types';

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface EditingRenderFlags {
  isInvalid: boolean;
  isLoading: boolean;
}

export interface InlineEditableTableColumn<Item extends ItemWithAnID> extends Column<Item> {
  field: string;
  editingRender: (
    item: Item,
    onChange: (value: string) => void,
    flags: EditingRenderFlags
  ) => React.ReactNode;
}
