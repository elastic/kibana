/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import React from 'react';
// import { useContext } from 'react';
// import { Logger } from 'src/core/server';
// import { Observable } from 'rxjs';
// import { LogLevel } from 'src/core/server';
// import { format as formatUrl } from 'url';
// import { DEFAULT_APP_CATEGORIES } from 'src/core/public';
// import { foo } from 'react-vis';
// import { ReexportedAgentName as DoublyReexportedAgentName } from './test_imports_2';
// import { UiSettingsConfigType } from 'src/core/server/ui_settings/ui_settings_config';
// import type { AgentConfigOptions } from '@elastic/apm-rum';

// should result in

// import React from 'react';
// import { useContext } from 'react';
// import type { Logger } from '@kbn/logging';
// import { Observable } from 'rxjs';
// import { LogLevel } from '@kbn/logging';
// import type { LoggerFactory } from '@kbn/logging';
// import { format as formatUrl } from 'url';
// import { foo } from 'react-vis';
// import type { AgentConfigOptions } from '@elastic/apm-rum';
// import { DEFAULT_APP_CATEGORIES } from './src/core/utils/default_app_categories';
// import type { AgentName as DoublyReexportedAgentName } from './test_imports_3';
// import type { UiSettingsConfigType } from './src/core/server/ui_settings/ui_settings_config';
