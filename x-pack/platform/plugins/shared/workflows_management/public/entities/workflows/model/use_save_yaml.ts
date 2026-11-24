/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAsyncThunk } from '../../../hooks/use_async_thunk';
import { saveYamlThunk } from '../store/workflow_detail/thunks/save_yaml_thunk';

export const useSaveYaml = () => useAsyncThunk(saveYamlThunk);
