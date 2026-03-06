/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm } from '@elastic/eui';
import React from 'react';
import { StreamNameFormRow } from '../stream_name_form_row';
import { StreamsESQLEditor } from '../esql_query_editor';

export function QueryStreamForm({ children }: React.PropsWithChildren<{}>) {
  return <EuiForm fullWidth>{children}</EuiForm>;
}

QueryStreamForm.StreamName = StreamNameFormRow;
QueryStreamForm.ESQLEditor = StreamsESQLEditor;
